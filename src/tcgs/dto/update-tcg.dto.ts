import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';

export class UpdateTcgDto {
  @ApiPropertyOptional({
    description: 'TCG name (e.g., Magic, Pokemon, Yugi, One piece)',
    example: 'Magic',
  })
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'User-friendly display name',
    example: 'Magic: The Gathering',
  })
  @IsString()
  @MinLength(1)
  @IsOptional()
  display_name?: string;

  @ApiPropertyOptional({
    description: 'Whether the TCG is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}


