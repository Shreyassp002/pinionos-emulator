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

export const success = <T>(data: T): SuccessEnvelope<T> => ({
  data,
  mock: true,
  payment: MOCK_PAYMENT
});

export const errorResponse = (error: string): ErrorEnvelope => ({
  error,
  mock: true
});
