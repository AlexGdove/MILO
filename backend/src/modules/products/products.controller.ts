import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Injectable,
  Param,
  type PipeTransform,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import {
  PageQueryDto,
  ProductDto,
  ProductPageDto,
  ProductQueryDto,
  SubmissionDto,
  SubmissionPageDto,
  SubmitProductDto,
} from './dto/product.dto.js';
import { ProductsService } from './products.service.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorResponseDto } from '../../common/errors/error-response.dto.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { CurrentDeviceKey, DeviceKeyGuard } from '../device-keys/device-key.guard.js';
import type { DeviceKeyIdentity } from '../device-keys/device-keys.service.js';
import { RateLimit } from '../rate-limit/rate-limit.decorator.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** id продукта: не UUID — такого продукта нет (`404 product_not_found`). */
@Injectable()
export class ProductIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!UUID.test(value)) {
      throw new AppException(HttpStatus.NOT_FOUND, 'product_not_found', 'Product not found');
    }
    return value.toLowerCase();
  }
}

const VALIDATION = { type: ErrorResponseDto, description: 'code: validation_failed' } as const;

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @RateLimit('catalogRead')
  @ApiOperation({ summary: 'Общая база продуктов: поиск по названию / бренду или штрихкоду' })
  @ApiOkResponse({ type: ProductPageDto })
  @ApiBadRequestResponse(VALIDATION)
  catalog(@Query() query: ProductQueryDto): Promise<ProductPageDto> {
    return this.products.catalog(query);
  }

  @Get(':id')
  @RateLimit('catalogRead')
  @ApiOperation({ summary: 'Продукт общей базы' })
  @ApiOkResponse({ type: ProductDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'code: product_not_found' })
  get(@Param('id', ProductIdPipe) id: string): Promise<ProductDto> {
    return this.products.get(id);
  }
}

@ApiTags('products')
@Controller()
export class ProductSubmissionsController {
  constructor(private readonly products: ProductsService) {}

  @Post('product-submissions')
  @UseGuards(DeviceKeyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @RateLimit('productSubmit')
  @ApiSecurity('device-key')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'UUID; повтор с тем же телом → тот же ответ, с другим → 422',
  })
  @ApiOperation({
    summary: 'Предложить продукт в общую базу',
    description:
      'Автомодерация решает сразу: approved (продукт в базе), rejected (flags — причины) или pending (ждёт человека).',
  })
  @ApiCreatedResponse({ type: SubmissionDto })
  @ApiBadRequestResponse(VALIDATION)
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'code: idempotency_mismatch',
  })
  submit(
    @CurrentDeviceKey() deviceKey: DeviceKeyIdentity,
    @Body() dto: SubmitProductDto,
  ): Promise<SubmissionDto> {
    return this.products.submit(deviceKey.id, dto);
  }

  @Get('me/product-submissions')
  @UseGuards(DeviceKeyGuard)
  @RateLimit('catalogRead')
  @ApiSecurity('device-key')
  @ApiOperation({ summary: 'Свои предложения со статусами' })
  @ApiOkResponse({ type: SubmissionPageDto })
  mine(
    @CurrentDeviceKey() deviceKey: DeviceKeyIdentity,
    @Query() query: PageQueryDto,
  ): Promise<SubmissionPageDto> {
    return this.products.mine(deviceKey.id, query);
  }
}
