import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [SessionController],
  providers: [SessionService],
})
export class SessionModule {}
