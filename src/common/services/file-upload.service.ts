import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'pilgrim-documents';
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'uploads'): Promise<string> {
    try {
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${folder}/${randomUUID()}.${fileExtension}`;

      const params = {
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      await this.s3Client.send(new PutObjectCommand(params));

      const fileUrl = `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;
      this.logger.log(`File uploaded: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      this.logger.error('Upload failed:', error.message);
      throw new Error('Failed to upload file to S3');
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const key = fileUrl.split('.com/')[1];
      if (!key) throw new Error('Invalid file URL');

      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));

      this.logger.log(`File deleted: ${key}`);
    } catch (error) {
      this.logger.error('Delete failed:', error.message);
      throw new Error('Failed to delete file from S3');
    }
  }

  async uploadToCloudinary(file: Express.Multer.File, folder: string = 'kyc'): Promise<string> {
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    try {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder, resource_type: 'auto' },
          (error: any, result: any) => {
            if (error) reject(error);
            else resolve(result);
          },
        ).end(file.buffer);
      });
      return (result as any).secure_url;
    } catch (error) {
      this.logger.error('Cloudinary upload failed:', error.message);
      throw new Error('Failed to upload to Cloudinary');
    }
  }
}
