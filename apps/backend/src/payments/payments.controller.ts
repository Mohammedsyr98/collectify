import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import {
  paymentHistoryQuerySchema,
  replacePaymentRequestSchema,
  recordPaymentRequestSchema,
  type PaymentHistoryListResponse,
  type PaymentHistoryQuery,
  type ReplacePaymentRequest,
  type ReplacePaymentResponse,
  type RecordPaymentRequest,
  type RecordPaymentResponse,
} from '@collectify/contracts';

import { CurrentOwner, type AuthenticatedOwner } from '../auth';
import { ZodValidationPipe } from '../validation/zod-validation.pipe';
import { PaymentHistoryService } from './payment-history.service';
import { PaymentsService } from './payments.service';

const recordPaymentValidationPipe = new ZodValidationPipe(
  recordPaymentRequestSchema,
);
const paymentHistoryQueryValidationPipe = new ZodValidationPipe(
  paymentHistoryQuerySchema,
);
const replacePaymentValidationPipe = new ZodValidationPipe(
  replacePaymentRequestSchema,
);

@Controller('customers/:customerId/payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentHistoryService: PaymentHistoryService,
  ) {}

  @Get()
  listPaymentHistory(
    @CurrentOwner() currentOwner: AuthenticatedOwner,
    @Param('customerId') customerId: string,
    @Query(paymentHistoryQueryValidationPipe) query: PaymentHistoryQuery,
  ): Promise<PaymentHistoryListResponse> {
    return this.paymentHistoryService.listPaymentHistory(
      currentOwner,
      customerId,
      query,
    );
  }

  @Post()
  @HttpCode(201)
  recordPayment(
    @CurrentOwner() currentOwner: AuthenticatedOwner,
    @Param('customerId') customerId: string,
    @Body(recordPaymentValidationPipe) body: RecordPaymentRequest,
  ): Promise<RecordPaymentResponse> {
    return this.paymentsService.recordPayment(currentOwner, customerId, body);
  }

  @Put(':paymentId')
  replacePayment(
    @CurrentOwner() currentOwner: AuthenticatedOwner,
    @Param('customerId') customerId: string,
    @Param('paymentId') paymentId: string,
    @Body(replacePaymentValidationPipe) body: ReplacePaymentRequest,
  ): Promise<ReplacePaymentResponse> {
    return this.paymentsService.replacePayment(
      currentOwner,
      customerId,
      paymentId,
      body,
    );
  }
}
