import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { role_type } from '../../generated/prisma/enums.js';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Role type name',
    example: 'ADMIN',
    enum: role_type,
  })
  @IsEnum(role_type)
  @IsNotEmpty()
  name: role_type;

  @ApiProperty({
    description: 'Display name for the role',
    example: 'Administrator',
  })
  @IsString()
  @IsNotEmpty()
  display_name: string;
}

