import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { role_type } from '../../generated/prisma/enums.js';

export class UpdateRoleDto {
  @ApiProperty({
    description: 'Role type name',
    example: 'ADMIN',
    enum: role_type,
    required: false,
  })
  @IsEnum(role_type)
  @IsOptional()
  name?: role_type;

  @ApiProperty({
    description: 'Display name for the role',
    example: 'Administrator',
    required: false,
  })
  @IsString()
  @IsOptional()
  display_name?: string;
}

