import {
  createParamDecorator,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';

import type {
  AuthenticatedOwner,
  OwnerContextRequest,
} from './owner-context';

export type { AuthenticatedOwner } from './owner-context';

export const CurrentOwner = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedOwner => {
    const request = context.switchToHttp().getRequest<OwnerContextRequest>();

    if (!request.currentOwner) {
      throw new UnauthorizedException();
    }

    return request.currentOwner;
  },
);
