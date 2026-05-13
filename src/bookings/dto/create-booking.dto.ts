import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class TravellerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(0)
  age: number;

  @IsString()
  @IsNotEmpty()
  idProof: string;
}

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  packageDateId: string;

  @IsInt()
  @Min(1)
  seats: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TravellerDto)
  travellers: TravellerDto[];

  @IsOptional()
  @IsString()
  note?: string;
}

