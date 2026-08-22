import { applyDecorators, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

export const PUBLIC_ROUTE_METADATA_KEY = 'collectify:publicRoute';

export function PublicRoute(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    AllowAnonymous(),
    SetMetadata(PUBLIC_ROUTE_METADATA_KEY, true),
  );
}

export function isPublicRoute(
  reflector: Reflector,
  context: ExecutionContext,
): boolean {
  return (
    reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) === true
  );
}
