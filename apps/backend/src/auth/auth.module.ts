import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { DatabaseModule } from '../database/database.module';
import { OwnerContextService } from './owner/context/owner-context.service';
import { AuthProviderModule } from './provider/auth-provider.module';
import { OwnerContextInterceptor } from './route-access/owner-context.interceptor';

@Module({
  imports: [DatabaseModule, AuthProviderModule],
  providers: [
    OwnerContextService,
    {
      provide: APP_INTERCEPTOR,
      useClass: OwnerContextInterceptor,
    },
  ],
  exports: [AuthProviderModule, OwnerContextService],
})
export class AuthModule {}
