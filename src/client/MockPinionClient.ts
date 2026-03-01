import axios, { AxiosInstance } from 'axios';
import type {
  BalanceResult,
  ChatResult,
  FundResult,
  PriceResult,
  SendResult,
  SkillResponse,
  TradeResult,
  TxResult,
  WalletResult
} from 'pinion-os';
// These types exist in the SDK but are not re-exported from the main index
import type { BroadcastResult, UnlimitedResult, UnlimitedVerifyResult } from 'pinion-os/dist/client/types.js';

interface MockClientOptions {
  baseUrl?: string;
  /** Optional address to expose on the client (mirrors PinionClient.address) */
  address?: string;
}

function wrapAsSkillResponse<T>(data: T): SkillResponse<T> {
  return {
    status: 200,
    data,
    paidAmount: '0.01',
    responseTimeMs: 0
  };
}

/**
 * Drop-in replacement for PinionClient when the SDK cannot be redirected via apiUrl.
 * All skill methods return the same SkillResponse<T> shape as the real SDK.
 * Usage:
 *   const client = new MockPinionClient({ baseUrl: 'http://localhost:4020' });
 *   const result = await client.skills.price('ETH');
 *   console.log(result.data.priceUSD);
 */
export class MockPinionClient {
  private readonly http: AxiosInstance;

  /** Mirrors PinionClient.address — set via constructor or defaults to empty string */
  readonly address: string;

  constructor(options: MockClientOptions = {}) {
    this.http = axios.create({
      baseURL: options.baseUrl ?? 'http://localhost:4020',
      timeout: 10_000
    });
    this.address = options.address ?? '';
  }

  private async get<T>(path: string): Promise<SkillResponse<T>> {
    const start = Date.now();
    const res = await this.http.get<{ data?: T } & T>(path);
    const body = res.data;
    const data: T = (body as { data?: T }).data ?? (body as unknown as T);
    return { status: res.status, data, paidAmount: '0.01', responseTimeMs: Date.now() - start };
  }

  private async post<T>(path: string, payload: Record<string, unknown>): Promise<SkillResponse<T>> {
    const start = Date.now();
    const res = await this.http.post<{ data?: T } & T>(path, payload);
    const body = res.data;
    const data: T = (body as { data?: T }).data ?? (body as unknown as T);
    return { status: res.status, data, paidAmount: '0.01', responseTimeMs: Date.now() - start };
  }

  readonly skills = {
    price: (token: string): Promise<SkillResponse<PriceResult>> =>
      this.get<PriceResult>(`/price/${token}`),

    balance: (address: string): Promise<SkillResponse<BalanceResult>> =>
      this.get<BalanceResult>(`/balance/${address}`),

    wallet: (): Promise<SkillResponse<WalletResult>> =>
      this.get<WalletResult>('/wallet/generate'),

    tx: (hash: string): Promise<SkillResponse<TxResult>> =>
      this.get<TxResult>(`/tx/${hash}`),

    fund: (address?: string): Promise<SkillResponse<FundResult>> =>
      this.get<FundResult>(`/fund/${address ?? this.address}`),

    chat: (
      message: string,
      history?: Array<{ role: string; content: string }>
    ): Promise<SkillResponse<ChatResult>> => {
      const messages = history
        ? [...history, { role: 'user', content: message }]
        : [{ role: 'user', content: message }];
      return this.post<ChatResult>('/chat', { messages });
    },

    send: (to: string, amount: string, token: string): Promise<SkillResponse<SendResult>> =>
      this.post<SendResult>('/send', { to, amount, token }),

    trade: (
      src: string,
      dst: string,
      amount: string,
      slippage?: number
    ): Promise<SkillResponse<TradeResult>> =>
      this.post<TradeResult>('/trade', { src, dst, amount, slippage: slippage ?? 1 }),

    broadcast: (
      tx: { to: string; data?: string; value?: string; gasLimit?: string },
      privateKey?: string
    ): Promise<SkillResponse<BroadcastResult>> =>
      this.post<BroadcastResult>('/broadcast', { tx, privateKey }),

    unlimited: (): Promise<SkillResponse<UnlimitedResult>> =>
      this.post<UnlimitedResult>('/unlimited', {}),

    catalog: async (): Promise<SkillResponse<{ skills: Array<{ name: string; path: string; method: string; description: string; price: string; priceToken: string }>; payTo: string; network: string; mock: boolean }>> => {
      const start = Date.now();
      const res = await this.http.get('/catalog');
      return { status: res.status, data: res.data, paidAmount: '0', responseTimeMs: Date.now() - start };
    },

    unlimitedVerify: async (key: string): Promise<UnlimitedVerifyResult> => {
      const res = await this.http.get<UnlimitedVerifyResult>('/unlimited/verify', { params: { key } });
      return res.data;
    }
  };
}

export { wrapAsSkillResponse };
