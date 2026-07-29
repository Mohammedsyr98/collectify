import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { AUTH_SESSION_READER } from '../session/auth-session-reader.contract';
import {
  BetterAuthRuntimeProvider,
  DefaultBetterAuthRuntimeProvider,
} from './better-auth-runtime.provider';
import { BetterAuthSessionReader } from './better-auth-session.reader';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: BetterAuthRuntimeProvider,
      useClass: DefaultBetterAuthRuntimeProvider,
    },
    BetterAuthSessionReader,
    {
      provide: AUTH_SESSION_READER,
      useExisting: BetterAuthSessionReader,
    },
  ],
  exports: [AUTH_SESSION_READER],
})
export class AuthModule {}
