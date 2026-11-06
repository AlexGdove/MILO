import { Controller, Get, HttpStatus } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AppException } from '../common/errors/app.exception.js';
import { ErrorResponseDto } from '../common/errors/error-response.dto.js';
import { SkipGlobalRateLimit } from '../modules/rate-limit/rate-limit.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status!: 'ok';
}

class ReadinessChecksDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  database!: 'ok';

  @ApiProperty({ enum: ['ok'], example: 'ok' })
  redis!: 'ok';
}

export class ReadinessResponseDto extends HealthResponseDto {
  @ApiProperty({ type: ReadinessChecksDto })
  checks!: ReadinessChecksDto;
}

// Мониторинг и оркестратор опрашивают часто; без лимита /health отвечает и без Redis
@SkipGlobalRateLimit()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Процесс запущен (без проверки зависимостей)' })
  @ApiOkResponse({ type: HealthResponseDto })
  check(): HealthResponseDto {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Готов обслуживать запросы: база и Redis доступны' })
  @ApiOkResponse({ type: ReadinessResponseDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto, description: 'code: not_ready' })
  async ready(): Promise<ReadinessResponseDto> {
    const [database, redis] = await Promise.all([this.prisma.isReady(), this.redis.isReady()]);
    if (!database || !redis) {
      const down = [!database && 'Database', !redis && 'Redis'].filter(Boolean).join(' and ');
      throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, 'not_ready', `${down} unavailable`);
    }
    return { status: 'ok', checks: { database: 'ok', redis: 'ok' } };
  }
}
