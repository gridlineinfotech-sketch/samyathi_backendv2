import { Module, Global } from '@nestjs/common';
import { RedisCacheService } from './services/redis-cache.service';
import { FileUploadService } from './services/file-upload.service';
import { StripeService } from './services/stripe.service';
import { EmailService } from './services/email.service';
import { WinstonLoggerService } from './services/logger.service';

@Global()
@Module({
  providers: [RedisCacheService, FileUploadService, StripeService, EmailService, WinstonLoggerService],
  exports: [RedisCacheService, FileUploadService, StripeService, EmailService, WinstonLoggerService],
})
export class CommonModule {}
