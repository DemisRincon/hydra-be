import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service.js';
import { Logger } from '@nestjs/common';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook/mercadopago')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mercado Pago webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async handleMercadoPagoWebhook(
    @Body() data: any,
    @Headers('x-signature') signature?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    this.logger.log(
      `Received Mercado Pago webhook: ${requestId || 'no-request-id'}`,
    );

    // TODO: Verify webhook signature
    // const isValid = await this.verifyWebhookSignature(data, signature);
    // if (!isValid) {
    //   throw new UnauthorizedException('Invalid webhook signature');
    // }

    return this.paymentsService.processWebhook(data);
  }
}

