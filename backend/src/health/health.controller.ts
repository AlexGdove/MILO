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
import { PrismaService } from '../prisma/prisma.service.js';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status!: 'ok';
}

class ReadinessChecksDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  database!: 'ok';
}

export class ReadinessResponseDto extends HealthResponseDto {
  @ApiProperty({ type: ReadinessChecksDto })
  checks!: ReadinessChecksDto;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Процесс запущен (без проверки зависимостей)' })
  @ApiOkResponse({ type: HealthResponseDto })
  check(): HealthResponseDto {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Готов обслуживать запросы: база доступна' })
  @ApiOkResponse({ type: ReadinessResponseDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto, description: 'code: not_ready' })
  async ready(): Promise<ReadinessResponseDto> {
    if (!(await this.prisma.isReady())) {
      throw new AppException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'not_ready',
        'Database is unavailable',
      );
    }
    return { status: 'ok', checks: { database: 'ok' } };
  }
}
