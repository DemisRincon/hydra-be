import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateSingleDto {
  @ApiProperty({ description: 'Borderless flag', example: false })
  @IsBoolean()
  borderless: boolean;

  @ApiProperty({ description: 'Card name', example: 'Ral, Storm Conduit' })
  @IsString()
  cardName: string;

  @ApiProperty({ description: 'Card number', example: '211' })
  @IsString()
  cardNumber: string;

  @ApiProperty({ description: 'Category ID (UUID)', example: 'uuid-here' })
  @IsUUID()
  category_id: string;

  @ApiProperty({ description: 'Condition ID (UUID)', example: 'uuid-here' })
  @IsUUID()
  condition_id: string;

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

  @ApiProperty({ description: 'Language ID (UUID)', example: 'uuid-here' })
  @IsUUID()
  language_id: string;

  @ApiProperty({
    description: 'Hareruya link',
    example: 'https://www.hareruyamtg.com/en/products/detail/166212?lang=EN',
  })
  @IsString()
  link: string;

  @ApiPropertyOptional({ description: 'Metadata array', type: [String], example: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metadata?: string[];

  @ApiProperty({ description: 'Owner user ID (UUID)', example: 'uuid-here' })
  @IsUUID()
  owner_id: string;

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

  @ApiPropertyOptional({ description: 'Tags array', type: [String], example: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Variant (set name)',
    example: 'The List',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  variant?: string | null;
}
