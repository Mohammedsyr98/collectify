import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  createDebtRequestSchema,
  debtListQuerySchema,
  replaceDebtRequestSchema,
  type CreateDebtRequest,
  type DebtListQuery,
  type DebtListResponse,
  type DebtResponse,
  type ReplaceDebtRequest,
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
const replaceDebtValidationPipe = new ZodValidationPipe(
  replaceDebtRequestSchema,
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

  @Put(':debtId')
  replaceDebt(
    @CurrentOwner() currentOwner: AuthenticatedOwner,
    @Param('customerId') customerId: string,
    @Param('debtId') debtId: string,
    @Body(replaceDebtValidationPipe) body: ReplaceDebtRequest,
  ): Promise<DebtResponse> {
    return this.debtsService.replaceDebt(
      currentOwner,
      customerId,
      debtId,
      body,
    );
  }

  @Delete(':debtId')
  @HttpCode(204)
  deleteDebt(
    @CurrentOwner() currentOwner: AuthenticatedOwner,
    @Param('customerId') customerId: string,
    @Param('debtId') debtId: string,
  ): Promise<void> {
    return this.debtsService.deleteDebt(currentOwner, customerId, debtId);
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
