import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';

import { OwnerContextService } from '../owner/context/owner-context.service';
import type { OwnerContextRequest } from '../owner/context/owner-context.types';
import { isPublicRoute } from './public-route.decorator';

@Injectable()
export class OwnerContextInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly ownerContextService: OwnerContextService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    if (isPublicRoute(this.reflector, context)) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<OwnerContextRequest>();
    request.currentOwner = await this.ownerContextService.requireOwnerContext(
      request.user,
    );

    return next.handle();
  }
}
