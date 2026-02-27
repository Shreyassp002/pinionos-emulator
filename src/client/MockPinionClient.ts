import axios, { AxiosInstance } from 'axios';

interface MockClientOptions {
  baseUrl?: string;
}

/**
 * Fallback client for environments where PINION_API_URL override does not redirect SDK traffic.
 */
export class MockPinionClient {
  private readonly http: AxiosInstance;

  constructor(options: MockClientOptions = {}) {
    this.http = axios.create({
      baseURL: options.baseUrl ?? 'http://localhost:4020',
      timeout: 10_000
    });
  }

  readonly skills = {
    price: async (token: string): Promise<unknown> => (await this.http.get(`/price/${token}`)).data,
    balance: async (address: string): Promise<unknown> => (await this.http.get(`/balance/${address}`)).data,
    wallet: async (): Promise<unknown> => (await this.http.get('/wallet')).data,
    tx: async (hash: string): Promise<unknown> => (await this.http.get(`/tx/${hash}`)).data,
    fund: async (address: string): Promise<unknown> => (await this.http.get(`/fund/${address}`)).data,
    chat: async (message: string): Promise<unknown> => (await this.http.post('/chat', { message })).data,
    send: async (to: string, amount: string, token: string): Promise<unknown> =>
      (await this.http.post('/send', { to, amount, token })).data,
    trade: async (src: string, dst: string, amount: string): Promise<unknown> =>
      (await this.http.post('/trade', { src, dst, amount })).data,
    broadcast: async (): Promise<unknown> => (await this.http.post('/broadcast', {})).data,
    unlimited: async (): Promise<unknown> => (await this.http.get('/unlimited')).data
  };
}
