import { Controller, Delete, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiProperty,
  ApiSecurity,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AllowBlockedDeviceKey, CurrentDeviceKey, DeviceKeyGuard } from './device-key.guard.js';
import { type DeviceKeyIdentity, DeviceKeysService } from './device-keys.service.js';
import { ErrorResponseDto } from '../../common/errors/error-response.dto.js';
import { RateLimit } from '../rate-limit/rate-limit.decorator.js';

export class IssuedDeviceKeyDto {
  @ApiProperty({
    description: 'Ключ устройства. Показывается один раз — сервер хранит только хэш',
    example: 'mk_q3Jx0vLr8m1Kc9sZ2yWfA7tB4nHdE6uG5iOpQwErTyU',
    pattern: '^mk_[A-Za-z0-9_-]{43}$',
  })
  key!: string;
}

@ApiTags('device-keys')
@Controller('device-keys')
export class DeviceKeysController {
  constructor(private readonly deviceKeys: DeviceKeysService) {}

  @Post()
  @RateLimit('deviceKeyIssue')
  @ApiOperation({ summary: 'Выдать анонимный ключ устройства (ADR-0001)' })
  @ApiCreatedResponse({ type: IssuedDeviceKeyDto })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto, description: 'code: rate_limited' })
  async issue(): Promise<IssuedDeviceKeyDto> {
    return { key: await this.deviceKeys.issue() };
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(DeviceKeyGuard)
  @AllowBlockedDeviceKey()
  @RateLimit('recipeWrite')
  @ApiSecurity('device-key')
  @ApiOperation({
    summary: 'Удалить ключ и всё, что связано с устройством (рецепты, жалобы)',
    description: 'Разрешено и заблокированному ключу: право стереть свои данные не отнимается',
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'code: device_key_required | device_key_invalid',
  })
  async remove(@CurrentDeviceKey() deviceKey: DeviceKeyIdentity): Promise<void> {
    await this.deviceKeys.remove(deviceKey.id);
  }
}
