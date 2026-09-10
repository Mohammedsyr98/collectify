import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import {
  createDebtRequestSchema,
  type CreateDebtRequest,
  type DebtListResponse,
  type DebtResponse,
} from '@collectify/contracts';

import { CurrentOwner, type AuthenticatedOwner } from '../auth';
import { ZodValidationPipe } from '../validation/zod-validation.pipe';
import { DebtsService } from './debts.service';

const createDebtValidationPipe = new ZodValidationPipe(
  createDebtRequestSchema,
);

@Controller('customers/:customerId/debts')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Post()
  @HttpCode(201)
  createDebt(
    @CurrentOwner() currentOwner: AuthenticatedOwner,
    @Param('customerId') customerId: string,
    @Body(createDebtValidationPipe) body: CreateDebtRequest,
  ): Promise<DebtResponse> {
    return this.debtsService.createDebt(currentOwner, customerId, body);
  }

  @Get()
  listDebts(
    @CurrentOwner() currentOwner: AuthenticatedOwner,
    @Param('customerId') customerId: string,
  ): Promise<DebtListResponse> {
    return this.debtsService.listDebts(currentOwner, customerId);
  }
}
