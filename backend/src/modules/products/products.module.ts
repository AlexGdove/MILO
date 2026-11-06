import { Module } from '@nestjs/common';

import {
  ProductIdPipe,
  ProductsController,
  ProductSubmissionsController,
} from './products.controller.js';
import { ProductsService } from './products.service.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { DeviceKeysModule } from '../device-keys/device-keys.module.js';

/** Общая база продуктов и предложения с автомодерацией (B-18). */
@Module({
  imports: [DeviceKeysModule],
  controllers: [ProductsController, ProductSubmissionsController],
  providers: [ProductsService, IdempotencyInterceptor, ProductIdPipe],
  exports: [ProductsService],
})
export class ProductsModule {}
