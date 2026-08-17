import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';

import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.service';
import { createCollectifyBetterAuth } from './better-auth/better-auth.factory';
import { OwnerContextInterceptor } from './owner-context/owner-context.interceptor';
import { OwnerContextService } from './owner-context/owner-context.service';

@Module({
  imports: [
    DatabaseModule,
    BetterAuthModule.forRootAsync({
      imports: [DatabaseModule],
      inject: [DatabaseService],
      useFactory: (databaseService: DatabaseService) => ({
        auth: createCollectifyBetterAuth(databaseService.db),
      }),
    }),
  ],
  providers: [
    OwnerContextService,
    {
      provide: APP_INTERCEPTOR,
      useClass: OwnerContextInterceptor,
    },
  ],
  exports: [BetterAuthModule, OwnerContextService],
})
export class AuthModule {}
