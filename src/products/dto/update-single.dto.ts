import { PartialType } from '@nestjs/swagger';
import { CreateSingleDto } from './create-single.dto.js';

export class UpdateSingleDto extends PartialType(CreateSingleDto) {}
