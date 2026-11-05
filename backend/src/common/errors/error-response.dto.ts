import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ErrorDetailDto {
  @ApiPropertyOptional({ example: 'ingredients.0.amount' })
  field?: string;

  @ApiProperty({ example: 'amount must not be less than 0.01' })
  message!: string;
}

class ErrorBodyDto {
  @ApiProperty({ example: 'validation_failed' })
  code!: string;

  @ApiProperty({ example: 'Request validation failed' })
  message!: string;

  @ApiPropertyOptional({ type: [ErrorDetailDto] })
  details?: ErrorDetailDto[];

  @ApiProperty({ example: 'b3c1f0a4-9f3e-4c51-8f2a-1d2e3f4a5b6c' })
  requestId!: string;
}

/** Описание формата ошибки для Swagger. */
export class ErrorResponseDto {
  @ApiProperty({ type: ErrorBodyDto })
  error!: ErrorBodyDto;
}
