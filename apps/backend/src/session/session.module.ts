import { Module } from '@nestjs/common';

import { AuthModule } from '../auth';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

@Module({
  imports: [AuthModule],
  controllers: [SessionController],
  providers: [SessionService],
})
export class SessionModule {}
