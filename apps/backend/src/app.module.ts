import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { OwnerSignUpModule } from './owner-sign-up/owner-sign-up.module';
import { SessionModule } from './session/session.module';

@Module({
  imports: [DatabaseModule, OwnerSignUpModule, SessionModule],
  controllers: [HealthController],
})
export class AppModule {}
