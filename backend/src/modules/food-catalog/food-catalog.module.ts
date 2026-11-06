import { Module } from '@nestjs/common';

import { FoodCatalogController } from './food-catalog.controller.js';
import { FoodCatalogService } from './food-catalog.service.js';
import { RateLimitModule } from '../rate-limit/rate-limit.module.js';

/** Open Food Facts для браузера и PWA: поиск с кэшем и общим лимитом (решение №53). */
@Module({
  imports: [RateLimitModule],
  controllers: [FoodCatalogController],
  providers: [FoodCatalogService],
})
export class FoodCatalogModule {}
