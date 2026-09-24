import { Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import { DatabaseModule } from '../database/database.module';
import { ReceivablesModule } from '../receivables/receivables.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [AuthModule, DatabaseModule, ReceivablesModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
