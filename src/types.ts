export interface PaymentReceipt {
  amount: '0.01';
  token: 'USDC';
  status: 'simulated';
  txHash: null;
}

export interface SuccessEnvelope<T> {
  data: T;
  mock: true;
  payment: PaymentReceipt;
}

export interface ErrorEnvelope {
  error: string;
  mock: true;
}

export const MOCK_PAYMENT: PaymentReceipt = {
  amount: '0.01',
  token: 'USDC',
  status: 'simulated',
  txHash: null
};

export const success = <T>(data: T): SuccessEnvelope<T> => {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return {
      ...(data as Record<string, unknown>),
      data,
      mock: true,
      payment: MOCK_PAYMENT
    } as SuccessEnvelope<T>;
  }

  return {
    data,
    mock: true,
    payment: MOCK_PAYMENT
  };
};

export const errorResponse = (error: string): ErrorEnvelope => ({
  error,
  mock: true
});
