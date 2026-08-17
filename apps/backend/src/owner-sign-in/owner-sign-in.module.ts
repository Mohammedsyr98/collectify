import { Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import { OwnerSignInController } from './owner-sign-in.controller';
import { OwnerSignInService } from './owner-sign-in.service';

@Module({
  imports: [AuthModule],
  controllers: [OwnerSignInController],
  providers: [OwnerSignInService],
})
export class OwnerSignInModule {}
