import { HttpStatus, Injectable } from '@nestjs/common';

import type { CreatedTicketDto, MessagesQueryDto, SupportTicketDto } from './dto/support.dto.js';
import { SupportEvents } from './support.events.js';
import { MESSAGE_INCLUDE, TICKET_INCLUDE, toMessage, toTicket } from './support.mapper.js';
import { AppException } from '../../common/errors/app.exception.js';
import { cursorPage, type PageQueryDto } from '../../common/pagination/page.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type Tx = Prisma.TransactionClient;

/** События outbox для бота поддержки (этап 9, ADR-0003): только id, без текстов. */
export const TICKET_CREATED_EVENT = 'ticket.created';
export const TICKET_USER_MESSAGE_EVENT = 'ticket.message_from_user';
export const TICKET_CLOSED_EVENT = 'ticket.closed';

const notFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'ticket_not_found', 'Ticket not found');

/**
 * Анонимная поддержка (B-10, B-18): обращения и сообщения устройства. Время записей задаёт
 * приложение с точностью до мс — курсор списка и дозагрузка `?after=` сравнивают время с
 * точностью `Date` (как у продуктов). Изменение и событие outbox — одна транзакция;
 * WebSocket-события — после фиксации (`SupportEvents`).
 */
@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: SupportEvents,
  ) {}

  /** Новое обращение с первым сообщением пользователя. */
  async createTicket(deviceKeyId: string, text: string): Promise<CreatedTicketDto> {
    const now = new Date();
    const ticket = await this.prisma.$transaction(async (tx) => {
      const created = await tx.supportTicket.create({
        data: {
          deviceKeyId,
          createdAt: now,
          updatedAt: now,
          messages: { create: { author: 'user', text, createdAt: now } },
        },
        include: TICKET_INCLUDE,
      });
      await tx.outboxEvent.create({
        data: { type: TICKET_CREATED_EVENT, payload: { ticketId: created.id } },
      });
      return created;
    });
    const dto = toTicket(ticket);
    return { ...dto, messages: dto.lastMessage ? [dto.lastMessage] : [] };
  }

  /** Свои обращения по последней активности. */
  async list(deviceKeyId: string, query: PageQueryDto) {
    const page = await cursorPage(query, 'updatedAt', (after, take) =>
      this.prisma.supportTicket.findMany({
        where: { AND: [{ deviceKeyId }, after] },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take,
        include: TICKET_INCLUDE,
      }),
    );
    return { items: page.rows.map(toTicket), nextCursor: page.nextCursor };
  }

  async get(deviceKeyId: string, ticketId: string): Promise<SupportTicketDto> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, deviceKeyId },
      include: TICKET_INCLUDE,
    });
    if (!ticket) throw notFound();
    return toTicket(ticket);
  }

  /** Сообщения по возрастанию времени; `after` — дозагрузка после известного сообщения. */
  async messages(deviceKeyId: string, ticketId: string, query: MessagesQueryDto) {
    await this.ownTicket(this.prisma, deviceKeyId, ticketId);
    let after: Prisma.SupportMessageWhereInput = {};
    if (query.after) {
      const anchor = await this.prisma.supportMessage.findFirst({
        where: { id: query.after, ticketId },
        select: { id: true, createdAt: true },
      });
      if (!anchor) {
        throw new AppException(HttpStatus.BAD_REQUEST, 'validation_failed', 'Unknown message', [
          { field: 'after', message: 'after must be a message of this ticket' },
        ]);
      }
      after = {
        OR: [
          { createdAt: { gt: anchor.createdAt } },
          { createdAt: anchor.createdAt, id: { gt: anchor.id } },
        ],
      };
    }
    const rows = await this.prisma.supportMessage.findMany({
      where: { AND: [{ ticketId }, after] },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: query.limit,
      include: MESSAGE_INCLUDE,
    });
    return { items: rows.map(toMessage) };
  }

  /** Сообщение пользователя: обращение снова ждёт оператора (`open`), в т. ч. закрытое. */
  async addUserMessage(deviceKeyId: string, ticketId: string, text: string) {
    const now = new Date();
    const { message, ticket } = await this.prisma.$transaction(async (tx) => {
      await this.ownTicket(tx, deviceKeyId, ticketId);
      const created = await tx.supportMessage.create({
        data: { ticketId, author: 'user', text, createdAt: now },
        include: MESSAGE_INCLUDE,
      });
      const updated = await tx.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'open', updatedAt: now },
      });
      await tx.outboxEvent.create({
        data: {
          type: TICKET_USER_MESSAGE_EVENT,
          payload: { ticketId, messageId: created.id },
        },
      });
      return { message: created, ticket: updated };
    });
    const dto = toMessage(message);
    this.events.messageCreated(deviceKeyId, ticketId, dto);
    this.events.ticketUpdated(deviceKeyId, {
      id: ticket.id,
      status: ticket.status,
      updatedAt: ticket.updatedAt.toISOString(),
    });
    return dto;
  }

  /** Закрыть обращение; повторное закрытие ничего не меняет. */
  async close(deviceKeyId: string, ticketId: string): Promise<SupportTicketDto> {
    const now = new Date();
    const { ticket, changed } = await this.prisma.$transaction(async (tx) => {
      const current = await this.ownTicket(tx, deviceKeyId, ticketId);
      if (current.status === 'closed') {
        return {
          ticket: await tx.supportTicket.findUniqueOrThrow({
            where: { id: ticketId },
            include: TICKET_INCLUDE,
          }),
          changed: false,
        };
      }
      const updated = await tx.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'closed', updatedAt: now },
        include: TICKET_INCLUDE,
      });
      await tx.outboxEvent.create({
        data: { type: TICKET_CLOSED_EVENT, payload: { ticketId } },
      });
      return { ticket: updated, changed: true };
    });
    const dto = toTicket(ticket);
    if (changed) this.events.ticketUpdated(deviceKeyId, dto);
    return dto;
  }

  /**
   * Ответ оператора — для бота поддержки (этап 9), без HTTP. Только активный оператор;
   * обращение становится `answered`, устройство получает событие в WebSocket.
   */
  async addOperatorReply(operatorId: string, ticketId: string, text: string) {
    const now = new Date();
    const { message, ticket } = await this.prisma.$transaction(async (tx) => {
      const operator = await tx.operator.findUnique({
        where: { id: operatorId },
        select: { active: true },
      });
      if (!operator?.active) {
        throw new AppException(HttpStatus.FORBIDDEN, 'operator_inactive', 'Operator is not active');
      }
      const exists = await tx.supportTicket.findUnique({
        where: { id: ticketId },
        select: { id: true },
      });
      if (!exists) throw notFound();
      const created = await tx.supportMessage.create({
        data: { ticketId, author: 'operator', operatorId, text: text.trim(), createdAt: now },
        include: MESSAGE_INCLUDE,
      });
      const updated = await tx.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'answered', updatedAt: now },
      });
      return { message: created, ticket: updated };
    });
    const dto = toMessage(message);
    this.events.messageCreated(ticket.deviceKeyId, ticketId, dto);
    this.events.ticketUpdated(ticket.deviceKeyId, {
      id: ticket.id,
      status: ticket.status,
      updatedAt: ticket.updatedAt.toISOString(),
    });
    return dto;
  }

  /** Обращение принадлежит устройству; чужое неотличимо от несуществующего (404). */
  private async ownTicket(tx: Tx | PrismaService, deviceKeyId: string, ticketId: string) {
    const ticket = await tx.supportTicket.findFirst({
      where: { id: ticketId, deviceKeyId },
      select: { id: true, status: true },
    });
    if (!ticket) throw notFound();
    return ticket;
  }
}
