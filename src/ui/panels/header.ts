import { COLORS } from '../colors';

function line(width: number): string {
  return '═'.repeat(Math.max(0, width));
}

function boxWrap(contentLines: string[], width = 78): string {
  const top = `╔${line(width)}╗`;
  const bottom = `╚${line(width)}╝`;
  const lines = contentLines.map((lineText) => {
    const clean = lineText.slice(0, width);
    return `║${clean.padEnd(width, ' ')}║`;
  });
  return [top, ...lines, bottom].join('\n');
}

function figletBanner(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const figlet = require('figlet') as { textSync: (txt: string, opts?: Record<string, unknown>) => string };
    return figlet.textSync('PINION OS', { font: 'ANSI Shadow' });
  } catch {
    return [
      '██████╗ ██╗███╗   ██╗██╗ ██████╗ ███╗   ██╗ ██████╗ ███████╗',
      '██╔══██╗██║████╗  ██║██║██╔═══██╗████╗  ██║██╔═══██╗██╔════╝',
      '██████╔╝██║██╔██╗ ██║██║██║   ██║██╔██╗ ██║██║   ██║███████╗',
      '██╔═══╝ ██║██║╚██╗██║██║██║   ██║██║╚██╗██║██║   ██║╚════██║',
      '██║     ██║██║ ╚████║██║╚██████╔╝██║ ╚████║╚██████╔╝███████║',
      '╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝'
    ].join('\n');
  }
}

export interface HeaderOptions {
  port: number;
  totalCalls?: number;
  errorCount?: number;
  uptimeStr?: string;
  x402Payments?: number;
  network?: string;
  chainId?: number;
  x402Mode?: boolean;
  recording?: boolean;
}

export function buildHeaderText(port: number, totalCalls = 0, errorCount = 0, uptimeStr = '00:00:00', x402Payments = 0, opts?: Partial<HeaderOptions>): string {
  const bannerLines = figletBanner().split('\n').filter(Boolean);
  const networkName = opts?.network ?? 'base';
  const chainId = opts?.chainId ?? 8453;
  const subtitle1 = `E M U L A T O R  v1.0.0  ·  http://localhost:${port}`;
  const features: string[] = [];
  if (opts?.x402Mode) features.push('x402: ON');
  if (opts?.recording) features.push('REC');
  const featureTag = features.length > 0 ? `  ·  ${features.join(' · ')}` : '';
  const subtitle2 = `Zero-cost local simulator for PinionOS skills & agents  ·  Network: ${networkName} (${chainId})${featureTag}`;
  const x402Tag = x402Payments > 0 ? `   x402: ${x402Payments}` : '';
  const subtitle3 = `Calls: ${totalCalls}   Errors: ${errorCount}${x402Tag}   Uptime: ${uptimeStr}   Press q to quit`;
  const all = ['', ...bannerLines, '', subtitle1, subtitle2, subtitle3, ''];
  return `${COLORS.cyan}${boxWrap(all)}${COLORS.reset}`;
}

export function printHeader(port = 4020): void {
  process.stdout.write('\x1Bc');
  // eslint-disable-next-line no-console
  console.log(buildHeaderText(port));
}
