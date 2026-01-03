import { IsEnum, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentMethod {
  TRANSFER = 'transfer',
  MERCADOPAGO = 'mercadopago',
}

export enum ShippingMethod {
  ARRANGE = 'arrange',
  SHIPPING = 'shipping',
}

export class CreateOrderDto {
  @ApiProperty({
    enum: ShippingMethod,
    description: 'Shipping method: arrange (with seller) or shipping (to address)',
  })
  @IsEnum(ShippingMethod)
  @IsNotEmpty()
  shippingMethod: ShippingMethod;

  @ApiProperty({
    required: false,
    description: 'Address ID (required if shippingMethod is shipping)',
  })
  @IsString()
  @IsOptional()
  addressId?: string;

  @ApiProperty({
    required: false,
    description: 'Phone number for order updates',
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({
    enum: PaymentMethod,
    description: 'Payment method: transfer or mercadopago',
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;
}

