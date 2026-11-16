import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsBase64, IsOptional, IsString, MaxLength } from 'class-validator';

import { PHOTO_HINT_MAX_LENGTH, PHOTO_MAX_BYTES } from './photo-ai.config.js';
import { PhotoAiService, type RecognitionView } from './photo-ai.service.js';
import { ErrorResponseDto } from '../../common/errors/error-response.dto.js';
import type { SessionIdentity } from '../auth/auth.service.js';
import { CurrentSession, SessionGuard } from '../auth/session.guard.js';
import { RateLimit } from '../rate-limit/rate-limit.decorator.js';

/** Длина base64 для файла предельного размера */
const IMAGE_BASE64_MAX_LENGTH = Math.ceil(PHOTO_MAX_BYTES / 3) * 4;

class RecognizePhotoDto {
  @ApiProperty({
    description: 'Фото в base64 без префикса `data:` — JPEG, PNG или WebP, до 2 МБ',
    format: 'byte',
  })
  @IsString()
  @MaxLength(IMAGE_BASE64_MAX_LENGTH)
  @IsBase64()
  image!: string;

  @ApiPropertyOptional({
    maxLength: PHOTO_HINT_MAX_LENGTH,
    example: 'пельмени со свининой, 15 штук',
    description: 'Описание блюда от пользователя — уточняет распознавание',
  })
  @IsOptional()
  @IsString()
  @MaxLength(PHOTO_HINT_MAX_LENGTH)
  hint?: string;
}

class Per100gDto {
  @ApiProperty() kcal!: number;
  @ApiProperty() protein!: number;
  @ApiProperty() fat!: number;
  @ApiProperty() carbs!: number;
}

class RecognizedIngredientDto {
  @ApiProperty({ example: 'гречка отварная' })
  name!: string;

  @ApiProperty({ example: 200 })
  grams!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Запись справочника; null — нет в базе',
  })
  matchedName!: string | null;

  @ApiProperty({ type: Per100gDto, nullable: true, description: 'КБЖУ на 100 г по справочнику' })
  per100g!: Per100gDto | null;
}

class PhotoUsageDto {
  @ApiProperty({ type: Number, nullable: true, description: 'Распознаваний за сутки' })
  used!: number | null;

  @ApiProperty({ type: Number, nullable: true, description: 'Суточный лимит; null — без лимита' })
  limit!: number | null;
}

class RecognitionDto {
  @ApiProperty({ example: 'Гречневая каша с маслом' })
  dish!: string;

  @ApiProperty({ type: [RecognizedIngredientDto] })
  ingredients!: RecognizedIngredientDto[];

  @ApiProperty({ type: PhotoUsageDto })
  usage!: PhotoUsageDto;
}

/** Распознавание блюда по фото для платных тарифов (решения №68, №75). */
@ApiTags('photo-ai')
@ApiBearerAuth('session')
@Controller('photo-ai')
@UseGuards(SessionGuard)
export class PhotoAiController {
  constructor(private readonly photoAi: PhotoAiService) {}

  @Post('recognize')
  @HttpCode(HttpStatus.OK)
  @RateLimit('photoAi')
  @ApiOperation({ summary: 'Определить блюдо и ингредиенты по фото; КБЖУ — по справочнику' })
  @ApiOkResponse({ type: RecognitionDto })
  @ApiResponse({
    status: 403,
    type: ErrorResponseDto,
    description: 'code: photo_ai_plan_required — нужен платный тариф',
  })
  @ApiResponse({
    status: 422,
    type: ErrorResponseDto,
    description: 'code: photo_invalid | photo_no_food',
  })
  @ApiResponse({ status: 429, type: ErrorResponseDto, description: 'code: photo_ai_limit' })
  @ApiResponse({ status: 502, type: ErrorResponseDto, description: 'code: photo_ai_failed' })
  @ApiResponse({
    status: 503,
    type: ErrorResponseDto,
    description: 'code: photo_ai_unavailable | photo_ai_busy',
  })
  recognize(
    @CurrentSession() session: SessionIdentity,
    @Body() dto: RecognizePhotoDto,
  ): Promise<RecognitionView> {
    return this.photoAi.recognize(session.accountId, dto);
  }
}
