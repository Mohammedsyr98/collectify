export const customerApiErrorCode = {
  validationError: 'VALIDATION_ERROR',
  customerCodeAlreadyExists: 'CUSTOMER_CODE_ALREADY_EXISTS',
  customerNotFound: 'CUSTOMER_NOT_FOUND',
} as const;

export const customerApiErrorCodes = [
  customerApiErrorCode.validationError,
  customerApiErrorCode.customerCodeAlreadyExists,
  customerApiErrorCode.customerNotFound,
] as const;

export type CustomerApiErrorCode = (typeof customerApiErrorCodes)[number];

const customerApiErrorCodeSet = new Set<string>(customerApiErrorCodes);

export function isCustomerApiErrorCode(
  code: string | undefined,
): code is CustomerApiErrorCode {
  return typeof code === 'string' && customerApiErrorCodeSet.has(code);
}
