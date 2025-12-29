import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsString,
  IsObject,
  Min,
} from 'class-validator';

export class AddCartItemDto {
  @ApiPropertyOptional({
    description: 'Local product ID (required if isHareruya is false)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  singleId?: string;

  @ApiProperty({
    description: 'Quantity of items to add',
    example: 1,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Whether the product is from Hareruya',
    example: false,
    default: false,
  })
  @IsNotEmpty()
  @IsBoolean()
  isHareruya: boolean;

  @ApiPropertyOptional({
    description: 'Hareruya product ID (required if isHareruya is true)',
    example: '135764',
  })
  @IsOptional()
  @IsString()
  hareruyaId?: string;

  @ApiPropertyOptional({
    description:
      'Product data (required only for Hareruya products, should contain at least: name, hareruyaId, language, foil)',
    type: Object,
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  productData?: Record<string, unknown>;
}
