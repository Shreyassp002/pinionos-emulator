export interface PriceEntry {
  token: string;
  usd: string;
  change24h: number | null;
}

export function renderPrices(entries: PriceEntry[], source: string, updatedAgoSeconds: number): string {
  const lines = entries.map((entry) => {
    const change = entry.change24h;
    const arrow = change === null ? '─' : change > 0 ? '↑' : change < 0 ? '↓' : '→';
    const pct = change === null ? '-' : `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
    const token = entry.token.padEnd(5, ' ');
    const numeric = Number(entry.usd);
    const usdText = Number.isFinite(numeric)
      ? `$${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : entry.usd;
    const usd = usdText.padStart(11, ' ');
    return `${token}${usd}  ${arrow}  ${pct}`;
  });

  lines.push('');
  lines.push(`[${source}] Updated ${updatedAgoSeconds}s ago`);
  return lines.join('\n');
}
