import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'John Doe', description: 'Name of the person receiving shipment' })
  @IsString()
  @IsOptional()
  receiver_name?: string;

  @ApiProperty({ example: '123 Main St', description: 'Street address' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: 'New York', description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'NY', description: 'State or Province' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '10001', description: 'Zip or Postal Code' })
  @IsString()
  @IsNotEmpty()
  zip_code: string;

  @ApiProperty({ example: 'USA', description: 'Country' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: false, description: 'Is this the default address?' })
  @IsBoolean()
  @IsOptional()
  is_default?: boolean;
}
