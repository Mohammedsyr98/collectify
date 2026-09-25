import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { CustomerReceivables } from './customer-receivables';

@Module({
  imports: [DatabaseModule],
  providers: [CustomerReceivables],
  exports: [CustomerReceivables],
})
export class ReceivablesModule {}
