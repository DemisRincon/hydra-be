import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({
    description: 'Tag name (unique)',
    example: 'Commander Personal',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

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
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  is_default?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the tag is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

