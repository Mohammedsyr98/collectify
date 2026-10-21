import { Body, Controller, Param, Post, HttpCode } from '@nestjs/common';
import {
  recordPaymentRequestSchema,
  type RecordPaymentRequest,
  type RecordPaymentResponse,
} from '@collectify/contracts';

import { CurrentOwner, type AuthenticatedOwner } from '../auth';
import { ZodValidationPipe } from '../validation/zod-validation.pipe';
import { PaymentsService } from './payments.service';

const recordPaymentValidationPipe = new ZodValidationPipe(
  recordPaymentRequestSchema,
);

@Controller('customers/:customerId/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(201)
  recordPayment(
    @CurrentOwner() currentOwner: AuthenticatedOwner,
    @Param('customerId') customerId: string,
    @Body(recordPaymentValidationPipe) body: RecordPaymentRequest,
  ): Promise<RecordPaymentResponse> {
    return this.paymentsService.recordPayment(currentOwner, customerId, body);
  }
}
