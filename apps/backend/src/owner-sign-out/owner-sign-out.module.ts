import { Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import { OwnerSignOutController } from './owner-sign-out.controller';
import { OwnerSignOutService } from './owner-sign-out.service';

@Module({
  imports: [AuthModule],
  controllers: [OwnerSignOutController],
  providers: [OwnerSignOutService],
})
export class OwnerSignOutModule {}
