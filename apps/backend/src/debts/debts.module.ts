import { Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import { DatabaseModule } from '../database/database.module';
import { DebtsController } from './debts.controller';
import { DebtsService } from './debts.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [DebtsController],
  providers: [DebtsService],
})
export class DebtsModule {}
