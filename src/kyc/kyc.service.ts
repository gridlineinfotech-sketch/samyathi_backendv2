import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FileUploadService } from '../common/services/file-upload.service';
import { unlink } from 'fs/promises';

@Injectable()
export class KycService {
  constructor(
    private prisma: PrismaService,
    private fileUploadService: FileUploadService,
  ) { }

  async uploadKyc(userId: string, file: Express.Multer.File, body: { documentType: string; maskedNumber: string }) {
    const provider = process.env.FILE_STORAGE_PROVIDER || 'local';
    let fileUrl: string;

    if (provider === 's3' || provider === 'cloudinary') {
      fileUrl = provider === 's3'
        ? await this.fileUploadService.uploadFile(file, 'kyc')
        : await this.fileUploadService.uploadToCloudinary(file, 'kyc');

      if (file.path) {
        await unlink(file.path).catch(() => undefined);
      }
    } else {
      fileUrl = `/uploads/${file.filename}`;
    }

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
