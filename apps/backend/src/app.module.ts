import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { CustomersModule } from './customers/customers.module';
import { HealthController } from './health.controller';
import { OwnerSignInModule } from './auth/owner/sign-in/owner-sign-in.module';
import { OwnerSignOutModule } from './auth/owner/sign-out/owner-sign-out.module';
import { OwnerSignUpModule } from './auth/owner/sign-up/owner-sign-up.module';
import { SessionModule } from './auth/owner/session/session.module';

@Module({
  imports: [
    DatabaseModule,
    CustomersModule,
    OwnerSignInModule,
    OwnerSignOutModule,
    OwnerSignUpModule,
    SessionModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
