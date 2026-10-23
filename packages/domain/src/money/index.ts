export function isMoneyWithinNumeric182Precision(value: string): boolean {
  const unsignedValue = value.startsWith('-') ? value.slice(1) : value;

  if (!/^\d+(?:\.\d{0,2})?$/.test(unsignedValue)) {
    return true;
  }

  const [wholeAmount] = unsignedValue.split('.');
  const normalizedWholeAmount = wholeAmount.replace(/^0+(?=\d)/, '');

  return normalizedWholeAmount.length <= 16;
}

export function parseMoney(value: string): bigint {
  if (!/^\d+(?:\.\d{0,2})?$/.test(value)) {
    throw new Error('Amount must contain only digits and at most two decimal places');
  }

  const [wholeAmount, fractionalAmount = ''] = value.split('.');
  const normalizedWholeAmount = wholeAmount.replace(/^0+(?=\d)/, '');

  return (
    BigInt(normalizedWholeAmount) * 100n +
    BigInt(fractionalAmount.padEnd(2, '0'))
  );
}

export function formatMoney(minorUnits: bigint): string {
  if (minorUnits < 0n) {
    throw new Error('Money cannot be negative');
  }

  const wholeAmount = minorUnits / 100n;
  const fractionalAmount = (minorUnits % 100n).toString().padStart(2, '0');

  return `${wholeAmount}.${fractionalAmount}`;
}
