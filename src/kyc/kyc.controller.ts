import { Controller, Post, Get, Body, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KycService } from './kyc.service';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) { }

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      }
    })
  }))
  upload(@Req() req, @UploadedFile() file: Express.Multer.File, @Body() body: { documentType: string; maskedNumber: string }) {
    return this.kycService.uploadKyc(req.user.userId, file, body);
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  getStatus(@Req() req) {
    return this.kycService.getStatus(req.user.userId);
  }
}
