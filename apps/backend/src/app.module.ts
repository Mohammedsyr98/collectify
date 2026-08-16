import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { OwnerSignInModule } from './owner-sign-in/owner-sign-in.module';
import { OwnerSignOutModule } from './owner-sign-out/owner-sign-out.module';
import { OwnerSignUpModule } from './owner-sign-up/owner-sign-up.module';
import { SessionModule } from './session/session.module';

@Module({
  imports: [
    DatabaseModule,
    OwnerSignInModule,
    OwnerSignOutModule,
    OwnerSignUpModule,
    SessionModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
