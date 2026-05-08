import { Controller, Get, Param, Query } from '@nestjs/common';
import { PackagesService } from './packages.service';

@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) { }

  @Get()
  findAll() {
    return this.packagesService.findAll();
  }

  @Get('search')
  search(@Query('location') location?: string, @Query('minDuration') minDuration?: string, @Query('maxDuration') maxDuration?: string, @Query('startDate') startDate?: string) {
    return this.packagesService.searchPackages({ location, minDuration: minDuration ? parseInt(minDuration) : undefined, maxDuration: maxDuration ? parseInt(maxDuration) : undefined, startDate });
  }

  @Get('available')
  getAvailable(@Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.packagesService.getAvailablePackages(dateFrom, dateTo);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.packagesService.findOne(id);
  }
}
