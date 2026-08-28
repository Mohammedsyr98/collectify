import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  createCustomerRequestSchema,
  type CreateCustomerRequest,
  type CreateCustomerResponse,
  type CustomerDetailsResponse,
} from '@collectify/contracts';

import { CurrentOwner, type AuthenticatedOwner } from '../auth';
import { ZodValidationPipe } from '../validation/zod-validation.pipe';
import { CustomersService } from './customers.service';
import { resolveCustomerValidationMessage } from './customers.errors';

const createCustomerValidationPipe = new ZodValidationPipe(
  createCustomerRequestSchema,
  {
    resolveIssueMessage: resolveCustomerValidationMessage,
  },
);

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(201)
  createCustomer(
    @CurrentOwner() currentOwner: AuthenticatedOwner,
    @Body(createCustomerValidationPipe) body: CreateCustomerRequest,
  ): Promise<CreateCustomerResponse> {
    return this.customersService.createCustomer(currentOwner, body);
  }

  @Get(':customerId')
  getCustomerById(
    @CurrentOwner() currentOwner: AuthenticatedOwner,
    @Param('customerId') customerId: string,
  ): Promise<CustomerDetailsResponse> {
    return this.customersService.getCustomerById(currentOwner, customerId);
  }
}
