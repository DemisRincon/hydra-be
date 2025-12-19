import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class HareruyaSearchResultDto {
  @ApiProperty({ description: 'Borderless flag', example: false })
  @IsBoolean()
  borderless: boolean;

  @ApiProperty({ description: 'Card name', example: 'Ral, Storm Conduit' })
  @IsString()
  cardName: string;

  @ApiProperty({ description: 'Card number', example: '211' })
  @IsString()
  cardNumber: string;

  @ApiProperty({ description: 'Category', example: 'SINGLES' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Condition', example: 'Near Mint' })
  @IsString()
  condition: string;

  @ApiProperty({ description: 'Expansion code', example: 'WAR' })
  @IsString()
  expansion: string;

  @ApiProperty({ description: 'Extended art flag', example: false })
  @IsBoolean()
  extendedArt: boolean;

  @ApiProperty({ description: 'Final price in MXN', example: 30 })
  @IsNumber()
  finalPrice: number;

  @ApiProperty({ description: 'Foil flag', example: false })
  @IsBoolean()
  foil: boolean;

  @ApiProperty({ description: 'Hareruya product ID', example: '166212' })
  @IsString()
  hareruyaId: string;

  @ApiProperty({
    description: 'Image URL',
    example: 'https://files.hareruyamtg.com/img/goods/L/The_List/WAR-211.jpg',
  })
  @IsString()
  img: string;

  @ApiProperty({ description: 'Is local inventory flag', example: false })
  @IsBoolean()
  isLocalInventory: boolean;

  @ApiProperty({ description: 'Language', example: 'Inglés' })
  @IsString()
  language: string;

  @ApiProperty({
    description: 'Hareruya link',
    example: 'https://www.hareruyamtg.com/en/products/detail/166212?lang=EN',
  })
  @IsString()
  link: string;

  @ApiProperty({ description: 'Metadata array', type: [String], example: [] })
  @IsArray()
  @IsString({ each: true })
  metadata: string[];

  @ApiProperty({ description: 'Prerelease flag', example: false })
  @IsBoolean()
  prerelease: boolean;

  @ApiProperty({ description: 'Premier play flag', example: false })
  @IsBoolean()
  premierPlay: boolean;

  @ApiProperty({ description: 'Formatted price string', example: '$30.00 MXN' })
  @IsString()
  price: string;

  @ApiProperty({ description: 'Show importacion badge flag', example: true })
  @IsBoolean()
  showImportacionBadge: boolean;

  @ApiProperty({ description: 'Source', example: 'hareruya' })
  @IsString()
  source: string;

  @ApiProperty({ description: 'Stock count', example: 0 })
  @IsNumber()
  stock: number;

  @ApiProperty({ description: 'Surge foil flag', example: false })
  @IsBoolean()
  surgeFoil: boolean;

  @ApiProperty({ description: 'Tags array', type: [String], example: [] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiPropertyOptional({
    description: 'Variant (set name)',
    example: 'The List',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  variant?: string | null;
}

export class CreateSingleDto {
  @ApiProperty({
    description: 'Product data from Hareruya search result',
    type: HareruyaSearchResultDto,
  })
  @ValidateNested()
  @Type(() => HareruyaSearchResultDto)
  hareruyaProduct: HareruyaSearchResultDto;

  @ApiProperty({ description: 'Owner user ID', example: 'uuid-here' })
  @IsString()
  owner_id: string;

  @ApiPropertyOptional({
    description: 'Category ID (if not provided, will use default)',
    example: 'uuid-here',
  })
  @IsOptional()
  @IsString()
  category_id?: string;
}

