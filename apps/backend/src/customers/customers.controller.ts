import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  createCustomerRequestSchema,
  customerListQuerySchema,
  updateCustomerRequestSchema,
  type CreateCustomerRequest,
  type CreateCustomerResponse,
  type CustomerDetailsResponse,
  type CustomerListQuery,
  type CustomerListResponse,
  type UpdateCustomerRequest,
  type UpdateCustomerResponse,
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
const updateCustomerValidationPipe = new ZodValidationPipe(
  updateCustomerRequestSchema,
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

  @Patch(':customerId')
  updateCustomer(
    @CurrentOwner() currentOwner: AuthenticatedOwner,
    @Param('customerId') customerId: string,
    @Body(updateCustomerValidationPipe) body: UpdateCustomerRequest,
  ): Promise<UpdateCustomerResponse> {
    return this.customersService.updateCustomer(
      currentOwner,
      customerId,
      body,
    );
  }
}
