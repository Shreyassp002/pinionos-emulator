import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

describe('cli', () => {
  it('accepts --no-dashboard flag', (t) => {
    const run = spawnSync(
      process.execPath,
      ['--require', 'ts-node/register', 'src/cli.ts', '--no-dashboard', '--help'],
      { encoding: 'utf-8' }
    );

    if (run.error && (run.error as NodeJS.ErrnoException).code === 'EPERM') {
      t.skip('sandbox prevents child process spawn');
      return;
    }

    assert.equal(run.status, 0, run.stderr || 'expected exit code 0');
    assert.match(run.stdout, /--no-dashboard/);
  });
});
