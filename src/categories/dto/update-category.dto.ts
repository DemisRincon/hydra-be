import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsInt, IsOptional, MinLength } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'Category code/name (e.g., SINGLES, BOOSTER, BOOSTER_BOX)',
    example: 'SINGLES',
  })
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'User-friendly display name',
    example: 'Singles',
  })
  @IsString()
  @MinLength(1)
  @IsOptional()
  display_name?: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Una carta individual',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the category is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Display order',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  order?: number;
}

