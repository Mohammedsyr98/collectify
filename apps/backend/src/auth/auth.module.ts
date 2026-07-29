import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';

import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.service';
import { createCollectifyBetterAuth } from './better-auth';

@Module({
  imports: [
    BetterAuthModule.forRootAsync({
      imports: [DatabaseModule],
      inject: [DatabaseService],
      useFactory: (databaseService: DatabaseService) => ({
        auth: createCollectifyBetterAuth(databaseService.db),
      }),
      disableGlobalAuthGuard: true,
    }),
  ],
  exports: [BetterAuthModule],
})
export class AuthModule {}
