export interface WalletPanelState {
  eth: string;
  usdc: string;
  keysIssued: number;
  address: string;
}

export function shortenAddress(address: string): string {
  if (!address || address.length < 12) {
    return address || 'n/a';
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function renderWallet(state: WalletPanelState): string {
  return [
    `ETH    ${state.eth}`,
    `USDC   ${state.usdc}`,
    `Keys   ${state.keysIssued} issued`,
    `Addr   ${shortenAddress(state.address)}`,
    '',
    '[config.json defaults]'
  ].join('\n');
}
