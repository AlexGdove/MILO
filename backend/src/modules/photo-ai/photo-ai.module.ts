import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { getPhotoAiConfig } from './photo-ai.config.js';
import { PhotoAiController } from './photo-ai.controller.js';
import { PhotoAiService } from './photo-ai.service.js';
import { OpenAiCompatibleVisionProvider, VisionProvider } from './vision-provider.js';
import { AuthModule } from '../auth/auth.module.js';
import { RateLimitModule } from '../rate-limit/rate-limit.module.js';

/**
 * Распознавание блюд по фото (решения №68, №75): модель называет блюдо и ингредиенты,
 * КБЖУ считает код по справочнику. Провайдер модели — за `VisionProvider`, выбирается настройкой.
 */
@Module({
  imports: [AuthModule, RateLimitModule],
  controllers: [PhotoAiController],
  providers: [
    PhotoAiService,
    {
      provide: VisionProvider,
      inject: [ConfigService],
      useFactory: (config: ConfigService): VisionProvider =>
        // Выключенная функция до провайдера не доходит: сервис отвечает `photo_ai_unavailable`
        new OpenAiCompatibleVisionProvider(getPhotoAiConfig(config)),
    },
  ],
})
export class PhotoAiModule {}
