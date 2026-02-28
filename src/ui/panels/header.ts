import { COLORS } from '../colors';
import { getAppVersion } from '../../version';

function terminalWidth(): number {
  return process.stdout.columns ?? 100;
}

function figletBanner(columns: number): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const figlet = require('figlet') as { textSync: (txt: string, opts?: Record<string, unknown>) => string };
    const font = columns >= 118 ? 'ANSI Shadow' : 'Small';
    return figlet.textSync('PINION OS', { font }).split('\n').filter((line) => line.trim().length > 0);
  } catch {
    if (columns >= 118) {
      return [
        '██████╗ ██╗███╗   ██╗██╗ ██████╗ ███╗   ██╗ ██████╗ ███████╗',
        '██╔══██╗██║████╗  ██║██║██╔═══██╗████╗  ██║██╔═══██╗██╔════╝',
        '██████╔╝██║██╔██╗ ██║██║██║   ██║██╔██╗ ██║██║   ██║███████╗',
        '██╔═══╝ ██║██║╚██╗██║██║██║   ██║██║╚██╗██║██║   ██║╚════██║',
        '██║     ██║██║ ╚████║██║╚██████╔╝██║ ╚████║╚██████╔╝███████║',
        '╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝'
      ];
    }
    return [
      '  ___ ___ _  _ ___ ___  _  _    ___  ___ ',
      ' | _ \\_ _| \\| |_ _/ _ \\| \\| |  / _ \\/ __|',
      ' |  _/| || .` || | (_) | .` | | (_) \\__ \\',
      ' |_| |___|_|\\_|___\\___/|_|\\_|  \\___/|___/'
    ];
  }
}

function fit(text: string, maxLen = 68): string {
  if (text.length <= maxLen) return text;
  if (maxLen <= 3) return '.'.repeat(maxLen);
  return `${text.slice(0, maxLen - 3)}...`;
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
  const cols = terminalWidth();
  const maxLen = Math.max(42, Math.min(104, cols - 12));
  const bannerLines = figletBanner(cols);
  const version = getAppVersion();
  const networkName = opts?.network ?? 'base';
  const chainId = opts?.chainId ?? 8453;
  const subtitle1 = fit(`E M U L A T O R  v${version}  |  http://localhost:${port}`, maxLen);
  const features: string[] = [];
  if (opts?.x402Mode) features.push('x402: ON');
  if (opts?.recording) features.push('REC');
  const featureTag = features.length > 0 ? ` | ${features.join(' | ')}` : '';
  const subtitle2 = fit(`Zero-cost local simulator for PinionOS skills & agents  |  Network: ${networkName} (${chainId})${featureTag}`, maxLen);
  const x402Tag = x402Payments > 0 ? ` | x402:${x402Payments}` : '';
  const subtitle3 = fit(`Calls: ${totalCalls}  |  Errors: ${errorCount}${x402Tag}  |  Uptime: ${uptimeStr}  |  Press q to quit`, maxLen);
  return `${COLORS.cyan}${[...bannerLines, '', subtitle1, subtitle2, subtitle3].join('\n')}${COLORS.reset}`;
}

export function printHeader(port = 4020): void {
  process.stdout.write('\x1Bc');
  // eslint-disable-next-line no-console
  console.log(buildHeaderText(port));
}
