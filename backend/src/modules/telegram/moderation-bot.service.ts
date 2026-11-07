import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import type { InlineButton, Update } from './bot-api.js';
import { encodeCallback, parseCallback } from './callback-data.js';
import { inOperatorsChat, TelegramCommonService, topicOptions } from './telegram-common.service.js';
import { TELEGRAM_BOTS, type TelegramBots } from './telegram.tokens.js';
import {
  decidedCardText,
  type ModerationOutcome,
  notOperatorText,
  submissionCardText,
} from './texts.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { ProductSubmission } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ModerationService } from '../moderation/moderation.service.js';
import { safeErrorMessage } from '../outbox/outbox.retry.js';
import { OutboxWorker } from '../outbox/outbox.worker.js';
import { SUBMISSION_REVIEW_EVENT } from '../products/products.service.js';

const OUTCOME_TOAST: Record<ModerationOutcome, string> = {
  approved: 'Принято в общую базу',
  rejected: 'Отклонено',
  blocked: 'Отклонено, устройство заблокировано',
  unblocked: 'Устройство разблокировано',
};

const reviewButtons = (submissionId: string): InlineButton[][] => [
  [
    { text: '✅ Принять', data: encodeCallback('approve', submissionId) },
    { text: '❌ Отклонить', data: encodeCallback('reject', submissionId) },
  ],
  [{ text: '🚫 Заблокировать устройство', data: encodeCallback('block', submissionId) }],
];

const toCard = (submission: ProductSubmission) =>
  submissionCardText({
    name: submission.name,
    brand: submission.brand,
    barcode: submission.barcode,
    unit: submission.unit,
    pieceWeight: submission.pieceWeight === null ? null : Number(submission.pieceWeight),
    kcal: Number(submission.kcal),
    protein: Number(submission.protein),
    fat: Number(submission.fat),
    carbs: Number(submission.carbs),
    flags: submission.flags,
    deviceKeyId: submission.deviceKeyId,
  });

/**
 * Бот модерации (B-18): предложения продуктов, которые автомодерация отправила человеку
 * (`pending`), — карточкой с кнопками «Принять» / «Отклонить» / «Заблокировать устройство».
 * Решение — через `ModerationService` (журнал `moderation_actions`); карточка после решения
 * показывает итог и оператора, кнопки убираются.
 */
@Injectable()
export class ModerationBotService implements OnModuleInit {
  private readonly logger = new Logger(ModerationBotService.name);

  constructor(
    @Inject(TELEGRAM_BOTS) private readonly bots: TelegramBots,
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
    private readonly common: TelegramCommonService,
    private readonly outbox: OutboxWorker,
  ) {}

  onModuleInit(): void {
    if (this.bots.moderation?.chatId == null) return;
    this.outbox.register(SUBMISSION_REVIEW_EVENT, async (payload) => {
      const id =
        payload && typeof payload === 'object' && !Array.isArray(payload)
          ? payload.submissionId
          : undefined;
      if (typeof id !== 'string') throw new Error('Outbox payload has no submissionId');
      await this.onReviewRequested(id);
    });
  }

  /** Карточка в чат модерации; уже решённое или удалённое предложение не отправляется. */
  private async onReviewRequested(submissionId: string): Promise<void> {
    const bot = this.bots.moderation;
    if (bot?.chatId == null) throw new Error('Moderation bot chat is not configured');
    const submission = await this.prisma.productSubmission.findUnique({
      where: { id: submissionId },
    });
    if (submission?.status !== 'pending') return;
    const sent = await bot.api.sendMessage(bot.chatId, toCard(submission), {
      ...topicOptions(bot),
      buttons: reviewButtons(submission.id),
    });
    await this.prisma.telegramMessageLink.create({
      data: { chatId: BigInt(bot.chatId), messageId: sent.messageId, submissionId },
    });
  }

  /** Обновление от Telegram: команды и нажатия кнопок под карточками. */
  async handleUpdate(update: Update): Promise<void> {
    const bot = this.bots.moderation;
    if (!bot || !(await this.common.firstTime('moderation', update.update_id))) return;
    if (update.message) {
      await this.common.answerCommand(bot.api, update.message);
      return;
    }
    const query = update.callback_query;
    if (!query) return;
    const answer = (text?: string, alert = false) =>
      bot.api.answerCallback(query.id, text, alert).catch(() => undefined);

    const card = query.message;
    const parsed = parseCallback(query.data);
    if (!card || !inOperatorsChat(bot, card) || !parsed) {
      await answer('Недоступно');
      return;
    }
    const operator = await this.common.activeOperator(query.from.id);
    if (!operator) {
      await answer(notOperatorText(query.from.id), true);
      return;
    }
    const submission = await this.prisma.productSubmission.findUnique({
      where: { id: parsed.submissionId },
    });
    if (!submission) {
      await answer('Предложение удалено вместе с данными устройства');
      await this.editCard(card.message_id, 'Предложение удалено.');
      return;
    }

    let outcome: ModerationOutcome;
    try {
      outcome = await this.decide(parsed.action, operator.id, submission);
    } catch (error) {
      const code = error instanceof AppException ? error.code : null;
      if (code === 'already_reviewed') {
        const status = submission.status === 'approved' ? '✅ Принято' : '❌ Отклонено';
        await this.editCard(card.message_id, `${toCard(submission)}\n\nУже решено: ${status}`);
        await answer('Уже решено');
        return;
      }
      if (code === 'device_key_not_found') {
        await answer('Устройство уже удалено');
        return;
      }
      this.logger.error({ err: safeErrorMessage(error) }, 'Moderation action failed');
      await answer('Не получилось. Попробуйте ещё раз.', true);
      return;
    }
    // После блокировки — возможность отменить её той же карточкой
    const buttons: InlineButton[][] | undefined =
      outcome === 'blocked'
        ? [
            [
              {
                text: '↩️ Разблокировать устройство',
                data: encodeCallback('unblock', submission.id),
              },
            ],
          ]
        : undefined;
    await this.editCard(
      card.message_id,
      decidedCardText(toCard(submission), outcome, operator.displayName),
      buttons,
    );
    await answer(OUTCOME_TOAST[outcome]);
  }

  private async decide(
    action: 'approve' | 'reject' | 'block' | 'unblock',
    operatorId: string,
    submission: ProductSubmission,
  ): Promise<ModerationOutcome> {
    switch (action) {
      case 'approve':
        await this.moderation.approveSubmission(operatorId, submission.id);
        return 'approved';
      case 'reject':
        await this.moderation.reject(operatorId, submission.id);
        return 'rejected';
      case 'block':
        if (submission.status === 'pending') {
          await this.moderation.reject(operatorId, submission.id);
        }
        await this.moderation.blockDeviceKey(operatorId, submission.deviceKeyId);
        return 'blocked';
      case 'unblock':
        await this.moderation.unblockDeviceKey(operatorId, submission.deviceKeyId);
        return 'unblocked';
    }
  }

  /** Правка карточки; ошибка Telegram (например, текст не изменился) не мешает решению. */
  private async editCard(messageId: number, text: string, buttons?: InlineButton[][]) {
    const bot = this.bots.moderation;
    if (bot?.chatId == null) return;
    await bot.api.editMessage(bot.chatId, messageId, text, buttons).catch((error: unknown) => {
      this.logger.warn({ err: safeErrorMessage(error) }, 'Moderation card edit failed');
    });
  }
}
