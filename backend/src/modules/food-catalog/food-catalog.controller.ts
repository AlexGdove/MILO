import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

import { FoodCatalogService } from './food-catalog.service.js';
import type { CatalogFood } from './off-parser.js';
import { ErrorResponseDto } from '../../common/errors/error-response.dto.js';
import { RateLimit } from '../rate-limit/rate-limit.decorator.js';

class CatalogSearchQueryDto {
  @ApiProperty({ minLength: 2, maxLength: 60, example: 'гречка' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 60)
  q!: string;
}

class CatalogFoodDto {
  @ApiProperty({ example: '4813494063866' })
  code!: string;

  @ApiProperty({ example: 'Гречка' })
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  brand!: string | null;

  @ApiProperty({ enum: ['g', 'ml'] })
  unit!: 'g' | 'ml';

  @ApiProperty({ example: { kcal: 340, protein: 13, fat: 3, carbs: 66 } })
  per100g!: CatalogFood['per100g'];
}

class CatalogSearchDto {
  @ApiProperty({ type: [CatalogFoodDto] })
  items!: CatalogFoodDto[];
}

/** Поиск продуктов в Open Food Facts для браузера и PWA (решение №53). Данные — ODbL. */
@ApiTags('food-catalog')
@Controller('food-catalog')
export class FoodCatalogController {
  constructor(private readonly catalog: FoodCatalogService) {}

  @Get('search')
  @RateLimit('catalogRead')
  @ApiOperation({ summary: 'Найти продукты в Open Food Facts (с КБЖУ на 100 г)' })
  @ApiOkResponse({ type: CatalogSearchDto })
  @ApiServiceUnavailableResponse({
    type: ErrorResponseDto,
    description: 'code: catalog_unavailable | catalog_busy',
  })
  search(@Query() query: CatalogSearchQueryDto): Promise<CatalogSearchDto> {
    return this.catalog.search(query.q);
  }
}
