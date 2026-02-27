export interface FeedEntry {
  timestamp: string;
  skill: string;
  result: string;
}

export function renderFeed(entries: FeedEntry[], totalCalls: number, totalSimulated: number, uptime: string): string {
  const lines = entries.map((entry) => {
    const label = `${entry.skill}`.padEnd(20, ' ');
    const result = entry.result.slice(0, 42).padEnd(42, ' ');
    return `${entry.timestamp}  ●  ${label} →  ${result}  💸 $0.01 USDC simulated`;
  });

  lines.push('');
  lines.push(`Total calls: ${totalCalls}   Total simulated: $${totalSimulated.toFixed(2)} USDC   Uptime: ${uptime}`);
  return lines.join('\n');
}
