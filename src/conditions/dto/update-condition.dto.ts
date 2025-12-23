import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateConditionDto {
  @ApiProperty({
    description: 'Condition code (NM, SP, MP, HP, DM)',
    example: 'NM',
    maxLength: 10,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  code?: string;

  @ApiProperty({
    description: 'Human-readable name in Spanish',
    example: 'Cerca de Mint',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Display name for UI',
    example: 'Cerca de Mint',
    required: false,
  })
  @IsString()
  @IsOptional()
  display_name?: string;
}



