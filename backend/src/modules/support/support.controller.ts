import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  Param,
  type PipeTransform,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

import {
  CreatedTicketDto,
  MessageListDto,
  MessagesQueryDto,
  SupportMessageDto,
  SupportTicketDto,
  TextDto,
  TicketPageDto,
} from './dto/support.dto.js';
import { SupportService } from './support.service.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorResponseDto } from '../../common/errors/error-response.dto.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { PageQueryDto } from '../../common/pagination/page.js';
import {
  AllowBlockedDeviceKey,
  CurrentDeviceKey,
  DeviceKeyGuard,
} from '../device-keys/device-key.guard.js';
import type { DeviceKeyIdentity } from '../device-keys/device-keys.service.js';
import { RateLimit } from '../rate-limit/rate-limit.decorator.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** id обращения: не UUID — такого обращения нет (`404 ticket_not_found`). */
@Injectable()
export class TicketIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!UUID.test(value)) {
      throw new AppException(HttpStatus.NOT_FOUND, 'ticket_not_found', 'Ticket not found');
    }
    return value.toLowerCase();
  }
}

const NOT_FOUND = { type: ErrorResponseDto, description: 'code: ticket_not_found' } as const;
const VALIDATION = { type: ErrorResponseDto, description: 'code: validation_failed' } as const;
const IDEMPOTENCY = {
  name: 'Idempotency-Key',
  required: false,
  description: 'UUID; повтор с тем же телом → тот же ответ, с другим → 422',
} as const;

/**
 * Поддержка (B-10, B-18). Заблокированный ключ тоже может писать — это путь обжалования
 * блокировки (B-19). Ответы операторов приходят из бота поддержки (этап 9).
 */
@ApiTags('support')
@ApiSecurity('device-key')
@Controller('support/tickets')
@UseGuards(DeviceKeyGuard)
@AllowBlockedDeviceKey()
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('ticketCreate')
  @ApiHeader(IDEMPOTENCY)
  @ApiOperation({ summary: 'Новое обращение с первым сообщением' })
  @ApiCreatedResponse({ type: CreatedTicketDto })
  @ApiBadRequestResponse(VALIDATION)
  create(
    @CurrentDeviceKey() deviceKey: DeviceKeyIdentity,
    @Body() dto: TextDto,
  ): Promise<CreatedTicketDto> {
    return this.support.createTicket(deviceKey.id, dto.text);
  }

  @Get()
  @RateLimit('supportRead')
  @ApiOperation({ summary: 'Свои обращения по последней активности' })
  @ApiOkResponse({ type: TicketPageDto })
  list(
    @CurrentDeviceKey() deviceKey: DeviceKeyIdentity,
    @Query() query: PageQueryDto,
  ): Promise<TicketPageDto> {
    return this.support.list(deviceKey.id, query);
  }

  @Get(':id')
  @RateLimit('supportRead')
  @ApiOperation({ summary: 'Обращение' })
  @ApiOkResponse({ type: SupportTicketDto })
  @ApiNotFoundResponse(NOT_FOUND)
  get(
    @CurrentDeviceKey() deviceKey: DeviceKeyIdentity,
    @Param('id', TicketIdPipe) id: string,
  ): Promise<SupportTicketDto> {
    return this.support.get(deviceKey.id, id);
  }

  @Get(':id/messages')
  @RateLimit('supportRead')
  @ApiOperation({ summary: 'Сообщения по возрастанию времени; ?after= — дозагрузка' })
  @ApiOkResponse({ type: MessageListDto })
  @ApiNotFoundResponse(NOT_FOUND)
  messages(
    @CurrentDeviceKey() deviceKey: DeviceKeyIdentity,
    @Param('id', TicketIdPipe) id: string,
    @Query() query: MessagesQueryDto,
  ): Promise<MessageListDto> {
    return this.support.messages(deviceKey.id, id, query);
  }

  @Post(':id/messages')
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('ticketMessage')
  @ApiHeader(IDEMPOTENCY)
  @ApiOperation({ summary: 'Сообщение в обращение; закрытое переоткрывается' })
  @ApiCreatedResponse({ type: SupportMessageDto })
  @ApiBadRequestResponse(VALIDATION)
  @ApiNotFoundResponse(NOT_FOUND)
  addMessage(
    @CurrentDeviceKey() deviceKey: DeviceKeyIdentity,
    @Param('id', TicketIdPipe) id: string,
    @Body() dto: TextDto,
  ): Promise<SupportMessageDto> {
    return this.support.addUserMessage(deviceKey.id, id, dto.text);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @RateLimit('ticketMessage')
  @ApiOperation({ summary: 'Закрыть обращение' })
  @ApiOkResponse({ type: SupportTicketDto })
  @ApiNotFoundResponse(NOT_FOUND)
  close(
    @CurrentDeviceKey() deviceKey: DeviceKeyIdentity,
    @Param('id', TicketIdPipe) id: string,
  ): Promise<SupportTicketDto> {
    return this.support.close(deviceKey.id, id);
  }
}
