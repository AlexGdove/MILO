import { randomBytes } from 'node:crypto';

import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { resetData } from './support/db.js';
import { fromPrismaError } from '../src/prisma/prisma-errors.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

/** Интеграция с реальной PostgreSQL (milo_test): схема, ограничения, каскады, ошибки. */
describe('База данных (e2e, PostgreSQL)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS);
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetData(prisma);
  });

  const newKey = () =>
    prisma.deviceKey.create({ data: { keyHash: randomBytes(32).toString('hex') } });

  const ingredient = (position: number, overrides: Record<string, unknown> = {}) => ({
    position,
    name: 'Гречка',
    amount: 100,
    unit: 'g' as const,
    pieceWeight: null,
    kcal: 330,
    protein: 12.6,
    fat: 3.3,
    carbs: 62.1,
    ...overrides,
  });

  const recipeData = (authorKeyId: string, overrides: Record<string, unknown> = {}) => ({
    authorKeyId,
    name: 'Гречка с курицей',
    servings: 2,
    kcalPerServing: 165,
    proteinPerServing: 6.3,
    fatPerServing: 1.65,
    carbsPerServing: 31.05,
    ...overrides,
  });

  it('GET /api/v1/health/ready → 200, база доступна', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
    expect(res.body).toEqual({ status: 'ok', checks: { database: 'ok' } });
  });

  it('рецепт со снимком ингредиентов сохраняется и читается по порядку', async () => {
    const key = await newKey();
    const created = await prisma.publicRecipe.create({
      data: {
        ...recipeData(key.id),
        ingredients: {
          create: [
            ingredient(1, { name: 'Яйцо', unit: 'pcs', amount: 2, pieceWeight: 55 }),
            ingredient(0),
          ],
        },
      },
    });

    const loaded = await prisma.publicRecipe.findUniqueOrThrow({
      where: { id: created.id },
      include: { ingredients: { orderBy: { position: 'asc' } } },
    });
    expect(loaded.status).toBe('published');
    expect(loaded.version).toBe(1);
    expect(loaded.fatPerServing.toNumber()).toBe(1.65);
    expect(loaded.ingredients.map((i) => i.name)).toEqual(['Гречка', 'Яйцо']);
    expect(loaded.ingredients[1]?.pieceWeight?.toNumber()).toBe(55);
    expect(loaded.ingredients[0]?.carbs.toNumber()).toBe(62.1);
  });

  it('повтор позиции ингредиента — P2002 → 409 conflict', async () => {
    const key = await newKey();
    const error: unknown = await prisma.publicRecipe
      .create({
        data: {
          ...recipeData(key.id),
          ingredients: { create: [ingredient(0), ingredient(0, { name: 'Курица' })] },
        },
      })
      .catch((e: unknown) => e);

    const mapped = fromPrismaError(error);
    expect(mapped?.getStatus()).toBe(409);
    expect(mapped?.code).toBe('conflict');
  });

  it('правка несуществующей записи — P2025 → 404 not_found', async () => {
    const error: unknown = await prisma.publicRecipe
      .update({ where: { id: '00000000-0000-4000-8000-000000000000' }, data: { version: 2 } })
      .catch((e: unknown) => e);
    expect(fromPrismaError(error)?.getStatus()).toBe(404);
  });

  describe('CHECK-ограничения (последний рубеж после DTO)', () => {
    it('порций должно быть 1–100', async () => {
      const key = await newKey();
      await expect(
        prisma.publicRecipe.create({ data: recipeData(key.id, { servings: 0 }) }),
      ).rejects.toThrow(/public_recipes_servings_check/);
    });

    it('название не может состоять из пробелов', async () => {
      const key = await newKey();
      await expect(
        prisma.publicRecipe.create({ data: recipeData(key.id, { name: '   ' }) }),
      ).rejects.toThrow(/public_recipes_name_check/);
    });

    it('штучный ингредиент без веса штуки отклоняется, у граммового вес запрещён', async () => {
      const key = await newKey();
      const recipe = await prisma.publicRecipe.create({ data: recipeData(key.id) });
      await expect(
        prisma.publicRecipeIngredient.create({
          data: { recipeId: recipe.id, ...ingredient(0, { unit: 'pcs', pieceWeight: null }) },
        }),
      ).rejects.toThrow(/piece_weight_check/);
      await expect(
        prisma.publicRecipeIngredient.create({
          data: { recipeId: recipe.id, ...ingredient(1, { pieceWeight: 50 }) },
        }),
      ).rejects.toThrow(/piece_weight_check/);
    });

    it('БЖУ на 100 г в сумме не больше 100', async () => {
      const key = await newKey();
      const recipe = await prisma.publicRecipe.create({ data: recipeData(key.id) });
      await expect(
        prisma.publicRecipeIngredient.create({
          data: { recipeId: recipe.id, ...ingredient(0, { protein: 60, fat: 30, carbs: 20 }) },
        }),
      ).rejects.toThrow(/nutrients_check/);
    });

    it('связь сообщения бота — ровно с одним: обращением или жалобой', async () => {
      await expect(
        prisma.telegramMessageLink.create({ data: { chatId: 1n, messageId: 1 } }),
      ).rejects.toThrow(/telegram_message_links_target_check/);
    });

    it('нарушение CHECK не превращается в ошибку клиента (останется 500)', async () => {
      const key = await newKey();
      const error: unknown = await prisma.publicRecipe
        .create({ data: recipeData(key.id, { servings: 0 }) })
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Error);
      expect(fromPrismaError(error)).toBeNull();
    });
  });

  it('удаление ключа устройства стирает его рецепты, жалобы и обращения; журнал модерации остаётся', async () => {
    const author = await newKey();
    const reporter = await newKey();
    const recipe = await prisma.publicRecipe.create({
      data: { ...recipeData(author.id), ingredients: { create: [ingredient(0)] } },
    });
    await prisma.recipeReport.create({
      data: { recipeId: recipe.id, reporterKeyId: reporter.id, reason: 'spam' },
    });
    const ticket = await prisma.supportTicket.create({
      data: { deviceKeyId: author.id, messages: { create: [{ author: 'user', text: 'Привет' }] } },
    });
    const operator = await prisma.operator.create({
      data: { telegramUserId: 42n, displayName: 'Анна' },
    });
    await prisma.moderationAction.create({
      data: { operatorId: operator.id, recipeId: recipe.id, action: 'hide_recipe' },
    });

    await prisma.deviceKey.delete({ where: { id: author.id } });

    expect(await prisma.publicRecipe.count()).toBe(0);
    expect(await prisma.publicRecipeIngredient.count()).toBe(0);
    expect(await prisma.recipeReport.count()).toBe(0);
    expect(await prisma.supportTicket.count({ where: { id: ticket.id } })).toBe(0);
    expect(await prisma.supportMessage.count()).toBe(0);
    const actions = await prisma.moderationAction.findMany();
    expect(actions).toHaveLength(1);
    expect(actions[0]?.recipeId).toBeNull();
    // Ключ того, кто жаловался, не затронут
    expect(await prisma.deviceKey.count({ where: { id: reporter.id } })).toBe(1);
  });

  it('номера обращений идут по порядку', async () => {
    const key = await newKey();
    const first = await prisma.supportTicket.create({ data: { deviceKeyId: key.id } });
    const second = await prisma.supportTicket.create({ data: { deviceKeyId: key.id } });
    expect(first.number).toBe(1);
    expect(second.number).toBe(2);
  });

  it('поиск по подстроке названия без учёта регистра', async () => {
    const key = await newKey();
    for (const name of ['Гречка с курицей', 'Омлет', 'Куриный суп']) {
      await prisma.publicRecipe.create({ data: recipeData(key.id, { name }) });
    }
    const found = await prisma.publicRecipe.findMany({
      where: { name: { contains: 'кур', mode: 'insensitive' } },
      orderBy: { name: 'asc' },
    });
    expect(found.map((r) => r.name)).toEqual(['Гречка с курицей', 'Куриный суп']);
  });
});
