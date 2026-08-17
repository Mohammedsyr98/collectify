import { Controller, Get } from '@nestjs/common';

import type { HealthResponse } from '@collectify/contracts';

import { PublicRoute } from './auth/public-route.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @PublicRoute()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
