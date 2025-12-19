import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSingleDto } from './create-single.dto.js';

export class CreateBulkSinglesDto {
  @ApiProperty({
    description: 'Array of single products to create',
    type: [CreateSingleDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSingleDto)
  products: CreateSingleDto[];
}

