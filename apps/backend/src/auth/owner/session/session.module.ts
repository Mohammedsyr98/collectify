import { Module } from '@nestjs/common';

import { AuthModule } from '../../index';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

@Module({
  imports: [AuthModule],
  controllers: [SessionController],
  providers: [SessionService],
})
export class SessionModule {}
