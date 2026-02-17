import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KycModule } from './kyc/kyc.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), KycModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
