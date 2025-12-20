import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class HybridSearchDto {
  @ApiProperty({
    description: 'Search query (card name)',
    example: 'Lightning Bolt',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  q: string;

  @ApiProperty({
    description: 'Page number (default: 1)',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Number of results per page (default: 12)',
    example: 12,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

