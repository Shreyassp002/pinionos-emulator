export interface WalletPanelState {
  eth: string;
  usdc: string;
  keysIssued: number;
  address: string;
  network?: string;
  chainId?: number;
}

export function shortenAddress(address: string): string {
  if (!address || address.length < 12) {
    return address || 'n/a';
  }
  return `${address.slice(0, 10)}...${address.slice(-6)}`;
}

export function renderWallet(state: WalletPanelState): string {
  const lines = [
    `ETH      ${state.eth.padStart(12)}`,
    `USDC     ${state.usdc.padStart(12)}`,
    ``,
    `Keys     ${String(state.keysIssued).padStart(12)} issued`,
    ``,
    `Addr     ${shortenAddress(state.address)}`,
    ``,
    `Network  ${state.network ?? 'base'} (${state.chainId ?? 8453})`,
    ``,
    `[source: config.json defaults]`
  ];
  return lines.join('\n');
}
