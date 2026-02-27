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

export function buildHeaderText(port: number): string {
  const bannerLines = figletBanner().split('\n').filter(Boolean);
  const subtitle1 = `E M U L A T O R  v1.0.0  ·  localhost:${port}`;
  const subtitle2 = 'Zero-cost local simulator for PinionOS skills & agents';
  const all = ['', ...bannerLines, '', subtitle1, subtitle2, ''];
  return `${COLORS.cyan}${boxWrap(all)}${COLORS.reset}`;
}

export function printHeader(port = 4020): void {
  process.stdout.write('\x1Bc');
  // eslint-disable-next-line no-console
  console.log(buildHeaderText(port));
}
