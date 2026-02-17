import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class KycService {
  constructor(private prisma: PrismaService) { }

  async uploadKyc(userId: string, file: Express.Multer.File, body: { documentType: string; maskedNumber: string }) {
    // In production, upload 'file' to S3/Cloudinary and get URL
    // Here we just use the filename as a mock URL
    const fileUrl = `/uploads/${file.filename}`;

    return this.prisma.kycDocument.create({
      data: {
        userId,
        documentType: body.documentType,
        maskedNumber: body.maskedNumber,
        fileUrl,
        status: 'pending',
      }
    });
  }

  async getStatus(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true, kycDocs: true }
    });
  }
}
