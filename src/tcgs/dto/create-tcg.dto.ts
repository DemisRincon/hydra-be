import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';

export class CreateTcgDto {
  @ApiProperty({
    description: 'TCG name (e.g., Magic, Pokemon, Yugi, One piece)',
    example: 'Magic',
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    description: 'User-friendly display name',
    example: 'Magic: The Gathering',
  })
  @IsString()
  @MinLength(1)
  display_name: string;

  @ApiPropertyOptional({
    description: 'Whether the TCG is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

