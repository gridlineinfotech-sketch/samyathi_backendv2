import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { resolveDatabaseConnection } from '../config/runtime-connections.config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly connection = resolveDatabaseConnection(process.env);

  constructor() {
    const connection = resolveDatabaseConnection(process.env);
    const options: Prisma.PrismaClientOptions | undefined = connection.url
      ? {
          datasources: {
            db: { url: connection.url },
          },
        }
      : undefined;

    super(options);

    if (connection.warning) {
      this.logger.warn(connection.warning);
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      if (this.connection.requiresPublicNetwork && this.connection.warning) {
        this.logger.error(this.connection.warning);
      }

      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
