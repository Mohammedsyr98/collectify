import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { SessionModule } from './session/session.module';

@Module({
  imports: [DatabaseModule, SessionModule],
  controllers: [HealthController],
})
export class AppModule {}
