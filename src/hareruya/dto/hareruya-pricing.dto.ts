import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional } from 'class-validator';

export class HareruyaPricingDto {
  @ApiProperty({
    description: 'Array of Hareruya product IDs',
    example: ['12345', '67890'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  productIds: string[];

  @ApiProperty({
    description: 'Optional array of card names for better matching',
    example: ['Lightning Bolt', 'Black Lotus'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cardNames?: string[];
}



