export interface FeedEntry {
  timestamp: string;
  method: string;
  skill: string;
  result: string;
  isError?: boolean;
  statusCode?: number;
}

export function renderFeed(entries: FeedEntry[], totalCalls: number, totalSimulated: number, uptimeStr: string): string {
  const lines = entries.map((entry) => {
    const ts = entry.timestamp.padEnd(8);
    const method = (entry.method || '   ').padEnd(4);
    const status = entry.statusCode ? `[${entry.statusCode}]` : '     ';
    const baseSkill = entry.skill.split('(')[0];
    const label = `${entry.skill}`.padEnd(22);
    const result = entry.result.slice(0, 38).padEnd(38);
    const cost = entry.isError ? '  ✗ ERROR      ' : '  💸 $0.01 USDC';

    if (baseSkill === 'ERROR') {
      return `${ts}  ${method} ${status}  ${label} →  ${result}  ✗ ERROR`;
    }
    if (baseSkill === 'SYSTEM') {
      return `${ts}  ----  -----  ${label}    ${result}`;
    }
    if (baseSkill === 'x402') {
      const tag = entry.statusCode === 402 ? '  🔒 402' : '  ✓ x402 paid';
      return `${ts}  ${method} ${status}  ${label} →  ${result}${tag}`;
    }
    if (baseSkill === 'x-api-key' || baseSkill === 'CHAOS' || baseSkill === 'facilitator' || baseSkill === 'x402-svc') {
      return `${ts}  ----  -----  ${label}    ${result}`;
    }

    return `${ts}  ${method} ${status}  ${label} →  ${result}${cost}`;
  });

  lines.push('');
  lines.push(`Total calls: ${totalCalls}   Simulated: $${totalSimulated.toFixed(2)} USDC   Uptime: ${uptimeStr}`);
  return lines.join('\n');
}
