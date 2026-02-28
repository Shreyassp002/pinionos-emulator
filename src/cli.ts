#!/usr/bin/env node

import { parseArgs } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const HELP = `
pinionos-emulator — Local PinionOS emulator for agent development

Usage:
  pinionos-emulator [command] [options]

Commands:
  start         Start the emulator (default)
  mcp           Start MCP stdio server (emulator must be running)
  init          Generate a starter config.json in the current directory

Options:
  --port <n>        Port to listen on (default: 4020)
  --x402            Enable x402 payment simulation mode
  --network <name>  Network: "base" (default) or "base-sepolia"
  --no-dashboard    Run without the terminal dashboard UI
  --config <path>   Path to config.json (default: ./config.json)
  --help, -h        Show this help message
  --version, -v     Show version

Examples:
  pinionos-emulator                       # Start with defaults
  pinionos-emulator --port 3000 --x402    # Custom port + x402 mode
  pinionos-emulator init                  # Create config.json
  npx pinionos-emulator                   # Zero-install usage
`.trim();

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      port: { type: 'string', short: 'p' },
      x402: { type: 'boolean', default: false },
      network: { type: 'string', short: 'n' },
      'no-dashboard': { type: 'boolean', default: false },
      config: { type: 'string', short: 'c' },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help) {
    console.log(HELP);
    return;
  }

  if (values.version) {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
    console.log(pkg.version);
    return;
  }

  // Apply config path override before command handling
  if (values.config) {
    const { setConfigPath } = await import('./config');
    setConfigPath(values.config);
    process.env.PINION_CONFIG_PATH = path.resolve(values.config);
  }

  const command = positionals[0] ?? 'start';

  if (command === 'init') {
    const { getDefaultConfig } = await import('./config');
    const dest = path.resolve(process.cwd(), 'config.json');
    if (fs.existsSync(dest)) {
      console.error(`config.json already exists at ${dest}`);
      process.exit(1);
    }
    fs.writeFileSync(dest, JSON.stringify(getDefaultConfig(), null, 2) + '\n');
    console.log(`Created config.json at ${dest}`);
    return;
  }

  if (command === 'mcp') {
    await import('./mcp/server');
    return;
  }

  // Apply CLI overrides
  const overrides: Record<string, unknown> = {};
  if (values.port) overrides.port = parseInt(values.port, 10);
  if (values.x402) overrides.x402Mode = true;
  if (values.network) overrides.network = values.network;

  if (Object.keys(overrides).length > 0) {
    const { setCliOverrides } = await import('./config');
    setCliOverrides(overrides);
  }

  // Set env flag for no-dashboard mode
  if (values['no-dashboard']) {
    process.env.PINION_NO_DASHBOARD = '1';
  }

  await import('./emulator');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
