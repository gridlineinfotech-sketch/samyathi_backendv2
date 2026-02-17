import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) { }

  findAll() {
    return this.prisma.package.findMany({
      include: { dates: true },
    });
  }

  findOne(id: string) {
    return this.prisma.package.findUnique({
      where: { id },
      include: { dates: true },
    });
  }
}
