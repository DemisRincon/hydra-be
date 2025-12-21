import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateConditionDto {
  @ApiProperty({
    description: 'Condition code (NM, SP, MP, HP, DM)',
    example: 'NM',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  code: string;

  @ApiProperty({
    description: 'Human-readable name in Spanish',
    example: 'Cerca de Mint',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Display name for UI',
    example: 'Cerca de Mint',
  })
  @IsString()
  @IsNotEmpty()
  display_name: string;
}


