import { Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import { DatabaseModule } from '../database/database.module';
import { OwnerSignUpController } from './owner-sign-up.controller';
import { OwnerSignUpService } from './owner-sign-up.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [OwnerSignUpController],
  providers: [OwnerSignUpService],
})
export class OwnerSignUpModule {}
