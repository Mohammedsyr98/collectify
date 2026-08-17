import { HttpException, HttpStatus } from '@nestjs/common';

import { authApiErrorCode } from '@collectify/contracts';

export const ownerProfileMissingResponse = {
  code: authApiErrorCode.ownerProfileMissing,
  message: 'Owner profile setup is incomplete.',
} as const;

export function ownerProfileMissingException(): HttpException {
  return new HttpException(
    ownerProfileMissingResponse,
    HttpStatus.CONFLICT,
  );
}
