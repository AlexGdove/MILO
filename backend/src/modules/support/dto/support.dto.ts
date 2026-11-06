import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

/** Строка без пробелов по краям; не строка остаётся как есть — её отклонит `IsString`. */
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Текст сообщения: 1–4000 символов после обрезки (как CHECK `support_messages_text_check`). */
export class TextDto {
  @ApiProperty({ minLength: 1, maxLength: 4000, example: 'Не сохраняется продукт в кладовой' })
  @Transform(trim)
  @IsString()
  @Length(1, 4000)
  text!: string;
}

export class MessagesQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Дозагрузка: сообщения после этого' })
  @IsOptional()
  @IsUUID()
  after?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;
}

// ---- Ответы ----

export const TICKET_STATUSES = ['open', 'answered', 'closed'] as const;
export type TicketStatusValue = (typeof TICKET_STATUSES)[number];

export class SupportMessageDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['user', 'operator'] })
  author!: 'user' | 'operator';

  @ApiProperty({ type: String, nullable: true, example: 'Анна' })
  operatorName!: string | null;

  @ApiProperty()
  text!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class SupportTicketDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 42, description: 'Номер обращения для человека' })
  number!: number;

  @ApiProperty({
    enum: TICKET_STATUSES,
    description: 'open — ждёт оператора; answered — оператор ответил; closed — закрыто',
  })
  status!: TicketStatusValue;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time', description: 'Последняя активность' })
  updatedAt!: string;

  @ApiProperty({ type: SupportMessageDto, nullable: true })
  lastMessage!: SupportMessageDto | null;
}

export class CreatedTicketDto extends SupportTicketDto {
  @ApiProperty({ type: [SupportMessageDto] })
  messages!: SupportMessageDto[];
}

export class TicketPageDto {
  @ApiProperty({ type: [SupportTicketDto] })
  items!: SupportTicketDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;
}

export class MessageListDto {
  @ApiProperty({ type: [SupportMessageDto] })
  items!: SupportMessageDto[];
}
