import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class OAuthSupabaseDto {
  @ApiProperty({
    description: 'Supabase user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  supabaseUserId: string;

  @ApiProperty({
    description: 'User email from Supabase',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'OAuth provider name',
    example: 'google',
  })
  @IsString()
  provider: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}


