import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateLanguageDto {
  @ApiProperty({
    description: 'Language code (JP, EN, CS, CT, FR, DE, IT, KO, PT, RU, ES, AG)',
    example: 'EN',
    maxLength: 10,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  code?: string;

  @ApiProperty({
    description: 'Human-readable name in Spanish',
    example: 'Inglés',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Display name for UI',
    example: 'Inglés',
    required: false,
  })
  @IsString()
  @IsOptional()
  display_name?: string;
}



