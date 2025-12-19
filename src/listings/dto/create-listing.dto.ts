import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsEnum } from 'class-validator';
import { listing_status_enum } from '../../generated/prisma/enums.js';

export class CreateListingDto {
  @ApiProperty({
    description: 'Product ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  product_id: string;

  @ApiProperty({
    description: 'Listing status',
    example: 'ACTIVE',
    enum: listing_status_enum,
    required: false,
    default: 'ACTIVE',
  })
  @IsEnum(listing_status_enum)
  @IsNotEmpty()
  status: listing_status_enum;
}

