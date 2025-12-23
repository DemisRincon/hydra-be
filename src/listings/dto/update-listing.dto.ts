import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { listing_status_enum } from '../../generated/prisma/enums.js';

export class UpdateListingDto {
  @ApiProperty({
    description: 'Listing status',
    example: 'ACTIVE',
    enum: listing_status_enum,
    required: false,
  })
  @IsEnum(listing_status_enum)
  @IsOptional()
  status?: listing_status_enum;
}



