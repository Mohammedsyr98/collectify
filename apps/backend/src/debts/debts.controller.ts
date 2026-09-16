import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  createDebtRequestSchema,
  debtListQuerySchema,
  type CreateDebtRequest,
  type DebtListQuery,
  type DebtListResponse,
  type DebtResponse,
} from '@collectify/contracts';

import { CurrentOwner, type AuthenticatedOwner } from '../auth';
import { ZodValidationPipe } from '../validation/zod-validation.pipe';
import { resolveDebtValidationMessage } from './debts.errors';
import { DebtsService } from './debts.service';

const createDebtValidationPipe = new ZodValidationPipe(
  createDebtRequestSchema,
  {
    resolveIssueMessage: resolveDebtValidationMessage,
  },
);
const debtListQueryValidationPipe = new ZodValidationPipe(
  debtListQuerySchema,
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
    @Query(debtListQueryValidationPipe) query: DebtListQuery,
  ): Promise<DebtListResponse> {
    return this.debtsService.listDebts(currentOwner, customerId, query);
  }
}
