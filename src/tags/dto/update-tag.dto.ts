import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class UpdateTagDto {
  @ApiPropertyOptional({
    description: 'Tag name (unique)',
    example: 'Commander Personal',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Display name for UI',
    example: 'Commander Personal',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  display_name?: string;

  @ApiPropertyOptional({
    description: 'Whether this tag should appear by default in forms',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  is_default?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the tag is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

