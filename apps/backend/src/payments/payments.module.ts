import { Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import { DatabaseModule } from '../database/database.module';
import { ReceivablesModule } from '../receivables';
import { PaymentHistoryService } from './payment-history.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentTargetsController } from './payment-targets.controller';
import { PaymentTargetsService } from './payment-targets.service';

@Module({
  imports: [AuthModule, DatabaseModule, ReceivablesModule],
  controllers: [PaymentsController, PaymentTargetsController],
  providers: [PaymentHistoryService, PaymentsService, PaymentTargetsService],
})
export class PaymentsModule {}
