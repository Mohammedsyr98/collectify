import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { OwnerSignInController } from './owner-sign-in.controller';
import { OwnerSignInService } from './owner-sign-in.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [OwnerSignInController],
  providers: [OwnerSignInService],
})
export class OwnerSignInModule {}
