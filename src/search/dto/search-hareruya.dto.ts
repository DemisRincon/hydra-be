import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchHareruyaDto {
  @ApiProperty({
    description: 'Search keyword (card name)',
    example: 'Rograkh, Son of Rohgahh',
  })
  @IsString()
  kw: string;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    example: 12,
    default: 12,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  rows?: number = 12;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Price filter (e.g., "1~*" for minimum 1)',
    example: '1~*',
  })
  @IsOptional()
  @IsString()
  priceFilter?: string;
}

