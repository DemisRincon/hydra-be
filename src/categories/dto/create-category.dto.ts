import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsInt, IsOptional, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category code/name (e.g., SINGLES, BOOSTER, BOOSTER_BOX)',
    example: 'SINGLES',
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    description: 'User-friendly display name',
    example: 'Singles',
  })
  @IsString()
  @MinLength(1)
  display_name: string;

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
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiProperty({
    description: 'Display order',
    example: 1,
  })
  @IsInt()
  order: number;
}



