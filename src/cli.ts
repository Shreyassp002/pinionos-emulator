#!/usr/bin/env node

async function main(): Promise<void> {
  const mode = process.argv[2] ?? 'start';

  if (mode === 'mcp') {
    await import('./mcp/server');
    return;
  }

  await import('./emulator');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
