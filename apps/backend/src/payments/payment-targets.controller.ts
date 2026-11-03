import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  paymentTargetQuerySchema,
  type PaymentTargetListResponse,
  type PaymentTargetQuery,
} from '@collectify/contracts';

import { CurrentOwner, type AuthenticatedOwner } from '../auth';
import { ZodValidationPipe } from '../validation/zod-validation.pipe';
import { PaymentTargetsService } from './payment-targets.service';

const paymentTargetQueryValidationPipe = new ZodValidationPipe(paymentTargetQuerySchema);

@Controller('customers/:customerId/payment-targets')
export class PaymentTargetsController {
  constructor(private readonly paymentTargetsService: PaymentTargetsService) {}

  @Get()
  listPaymentTargets(
    @CurrentOwner() currentOwner: AuthenticatedOwner,
    @Param('customerId') customerId: string,
    @Query(paymentTargetQueryValidationPipe) query: PaymentTargetQuery,
  ): Promise<PaymentTargetListResponse> {
    return this.paymentTargetsService.listPaymentTargets(currentOwner, customerId, query);
  }
}
