import { Body, Controller, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { DevToolsGuard } from './dev-tools.guard.js';
import { AppException } from '../../common/errors/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TextDto } from '../support/dto/support.dto.js';
import type { SupportMessageDto } from '../support/dto/support.dto.js';
import { SupportService } from '../support/support.service.js';

/** Оператор для локальной проверки поддержки (в журнале и чате — «Оператор (разработка)»). */
export const DEV_OPERATOR = { telegramUserId: -1n, displayName: 'Оператор (разработка)' };

/**
 * Служебные маршруты локальной разработки. Доступны только при `DEV_TOOLS=true` вне production
 * (`DevToolsGuard`, иначе 404); в production переменная запрещена проверкой ENV.
 * Ответ «как оператор» нужен, пока нет бота поддержки (этап 9): тот же
 * `SupportService.addOperatorReply`, что вызовет бот, — с событием в WebSocket.
 */
@ApiExcludeController()
@UseGuards(DevToolsGuard)
@Controller('dev/support/tickets')
export class DevToolsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly support: SupportService,
  ) {}

  @Post(':number/reply')
  async reply(
    @Param('number', ParseIntPipe) number: number,
    @Body() dto: TextDto,
  ): Promise<SupportMessageDto> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { number },
      select: { id: true },
    });
    if (!ticket) {
      throw new AppException(HttpStatus.NOT_FOUND, 'ticket_not_found', 'Ticket not found');
    }
    const operator = await this.prisma.operator.upsert({
      where: { telegramUserId: DEV_OPERATOR.telegramUserId },
      create: DEV_OPERATOR,
      update: { active: true },
      select: { id: true },
    });
    return this.support.addOperatorReply(operator.id, ticket.id, dto.text);
  }
}
