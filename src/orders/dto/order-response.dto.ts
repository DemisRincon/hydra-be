import { ApiProperty } from '@nestjs/swagger';

export class OrderItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  singleId?: string;

  @ApiProperty()
  hareruyaId?: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: string;

  @ApiProperty()
  productData?: any;
}

export class OrderShippingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  shippingMethod: string;

  @ApiProperty()
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    receiverName?: string;
  };
}

export class PaymentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  paymentMethod: string;

  @ApiProperty({ required: false })
  mercadopagoPaymentId?: string;

  @ApiProperty({ required: false })
  mercadopagoPreferenceId?: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  paymentData?: any;
}

export class OrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty({ type: [OrderItemResponseDto] })
  hareruyaItems: OrderItemResponseDto[];

  @ApiProperty({ required: false, type: OrderShippingResponseDto })
  shipping?: OrderShippingResponseDto;

  @ApiProperty({ required: false, type: PaymentResponseDto })
  payment?: PaymentResponseDto;

  @ApiProperty()
  total: string;
}

