/**
 * Shared in-memory store for issued unlimited API keys.
 * Shared between the /unlimited route (writes) and the apiKey middleware (reads).
 */
export interface ApiKeyEntry {
  issuedAt: number;
  address: string;
}

export const issuedKeys = new Map<string, ApiKeyEntry>();
