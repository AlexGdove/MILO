import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service.js';

/** Один клиент базы на всё приложение. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
