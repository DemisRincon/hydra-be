import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class HareruyaProductDto {
  @ApiProperty({ description: 'Hareruya product ID', example: '91507' })
  @IsString()
  product: string;

  @ApiProperty({ description: 'Product name (Japanese)', example: '【Foil】(197)《ロフガフフの息子、ログラクフ/Rograkh, Son of Rohgahh》[CMR] 赤U' })
  @IsString()
  product_name: string;

  @ApiProperty({ description: 'Product name (English)', example: '【Foil】《Rograkh, Son of Rohgahh》[CMR]' })
  @IsString()
  product_name_en: string;

  @ApiProperty({ description: 'Card name', example: 'Rograkh, Son of Rohgahh' })
  @IsString()
  card_name: string;

  @ApiProperty({ description: 'Language code (1=Japanese, 2=English)', example: '2' })
  @IsString()
  language: string;

  @ApiProperty({ description: 'Price in JPY', example: '200' })
  @IsString()
  price: string;

  @ApiProperty({ description: 'Image URL', example: 'https://files.hareruyamtg.com/img/goods/L/CMR/EN/0197.jpg' })
  @IsString()
  image_url: string;

  @ApiProperty({ description: 'Foil flag (0=non-foil, 1=foil)', example: '1' })
  @IsString()
  foil_flg: string;

  @ApiProperty({ description: 'Stock quantity', example: '0' })
  @IsString()
  stock: string;

  @ApiProperty({ description: 'Weekly sales count', example: '0' })
  @IsString()
  weekly_sales: string;

  @ApiProperty({ description: 'Product class ID', example: '592857' })
  @IsString()
  product_class: string;

  @ApiProperty({ description: 'Card condition (1=Near Mint, etc.)', example: '1' })
  @IsString()
  card_condition: string;

  @ApiProperty({ description: 'Sale flag (0=not on sale, 1=on sale)', example: '0' })
  @IsString()
  sale_flg: string;
}

export class CreateProductFromHareruyaDto {
  @ApiProperty({ description: 'Hareruya product data', type: HareruyaProductDto })
  @ValidateNested()
  @Type(() => HareruyaProductDto)
  hareruyaProduct: HareruyaProductDto;

  @ApiProperty({ description: 'Owner user ID', example: 'uuid-here' })
  @IsString()
  owner_id: string;

  @ApiPropertyOptional({ description: 'Category ID (if not provided, will use default)', example: 'uuid-here' })
  @IsOptional()
  @IsString()
  category_id?: string;
}

