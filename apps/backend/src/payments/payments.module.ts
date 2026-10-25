import { Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import { DatabaseModule } from '../database/database.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentTargetsController } from './payment-targets.controller';
import { PaymentTargetsService } from './payment-targets.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [PaymentsController, PaymentTargetsController],
  providers: [PaymentsService, PaymentTargetsService],
})
export class PaymentsModule {}
