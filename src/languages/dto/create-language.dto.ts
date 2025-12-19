import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateLanguageDto {
  @ApiProperty({
    description: 'Language code (JP, EN, CS, CT, FR, DE, IT, KO, PT, RU, ES, AG)',
    example: 'EN',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  code: string;

  @ApiProperty({
    description: 'Human-readable name in Spanish',
    example: 'Inglés',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Display name for UI',
    example: 'Inglés',
  })
  @IsString()
  @IsNotEmpty()
  display_name: string;
}

