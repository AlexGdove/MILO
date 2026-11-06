import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

/**
 * Socket.IO с теми же правилами, что HTTP: CORS только для адресов фронтенда
 * (`CORS_ORIGINS`), сообщения клиента не больше 64 КБ (клиент только слушает события).
 */
export class MiloIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly corsOrigins: string[],
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const merged = {
      ...options,
      cors: { origin: this.corsOrigins, methods: ['GET', 'POST'] },
      maxHttpBufferSize: 64 * 1024,
    } as ServerOptions;
    return super.createIOServer(port, merged) as Server;
  }
}
