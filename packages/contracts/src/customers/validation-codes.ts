export const customerValidationCode = {
  customerCodeRequired: 'CUSTOMER_CODE_REQUIRED',
  customerNameRequired: 'CUSTOMER_NAME_REQUIRED',
  customerPhoneNumberRequired: 'CUSTOMER_PHONE_NUMBER_REQUIRED',
} as const;

export const customerValidationCodes = [
  customerValidationCode.customerCodeRequired,
  customerValidationCode.customerNameRequired,
  customerValidationCode.customerPhoneNumberRequired,
] as const;

export type CustomerValidationCode =
  (typeof customerValidationCodes)[number];

const customerValidationCodeSet = new Set<string>(customerValidationCodes);

export function isCustomerValidationCode(
  code: string | undefined,
): code is CustomerValidationCode {
  return typeof code === 'string' && customerValidationCodeSet.has(code);
}
