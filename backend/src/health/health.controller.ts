import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status!: 'ok';
}

/** Живость процесса. Проверка готовности (`/health/ready`: база, Redis) — с этапа 4. */
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Процесс запущен' })
  @ApiOkResponse({ type: HealthResponseDto })
  check(): HealthResponseDto {
    return { status: 'ok' };
  }
}
