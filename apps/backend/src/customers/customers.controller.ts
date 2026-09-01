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
  createCustomerRequestSchema,
  customerListQuerySchema,
  type CreateCustomerRequest,
  type CreateCustomerResponse,
  type CustomerDetailsResponse,
  type CustomerListQuery,
  type CustomerListResponse,
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
const customerListQueryValidationPipe = new ZodValidationPipe(
  customerListQuerySchema,
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

  @Get()
  listCustomers(
    @CurrentOwner() currentOwner: AuthenticatedOwner,
    @Query(customerListQueryValidationPipe) query: CustomerListQuery,
  ): Promise<CustomerListResponse> {
    return this.customersService.listCustomers(currentOwner, query);
  }

  @Get(':customerId')
  getCustomerById(
    @CurrentOwner() currentOwner: AuthenticatedOwner,
    @Param('customerId') customerId: string,
  ): Promise<CustomerDetailsResponse> {
    return this.customersService.getCustomerById(currentOwner, customerId);
  }
}
