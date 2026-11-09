import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

import { ClientErrorsService } from './client-errors.service.js';
import { ClientErrorDto } from './dto/client-error.dto.js';
import { ErrorResponseDto } from '../../common/errors/error-response.dto.js';
import { DeviceKeyGuard } from '../device-keys/device-key.guard.js';
import { RateLimit } from '../rate-limit/rate-limit.decorator.js';

/** Сбор ошибок приложения (решение №62): технические данные, без личных. */
@ApiTags('client-errors')
@ApiSecurity('device-key')
@Controller('client-errors')
@UseGuards(DeviceKeyGuard)
export class ClientErrorsController {
  constructor(private readonly errors: ClientErrorsService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit('clientError')
  @ApiOperation({ summary: 'Отчёт об ошибке в приложении' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'code: validation_failed' })
  report(@Body() dto: ClientErrorDto): Promise<void> {
    return this.errors.report(dto);
  }
}
