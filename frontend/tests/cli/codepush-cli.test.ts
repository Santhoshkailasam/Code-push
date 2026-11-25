import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const cliPath = path.resolve(process.cwd(), 'bin/codepush.mjs');

describe('@codepush/cli (bin/codepush.mjs)', () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'codepush-cli-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('prints help usage when invoked with help or --help', () => {
    const output = execFileSync('node', [cliPath, 'help'], { encoding: 'utf8' });
    expect(output).toContain('CodePush Developer CLI Tool');
    expect(output).toContain('login');
    expect(output).toContain('release-react');
    expect(output).toContain('status');
    expect(output).toContain('rollback');
  });

  it('login saves API key and server URL to .codepushrc.json', () => {
    const output = execFileSync(
      'node',
      [cliPath, 'login', '--key', 'cp_live_cli_test_999', '--server', 'https://custom.codepush.dev'],
      {
        encoding: 'utf8',
        env: { ...process.env, HOME: tmpHome, USERPROFILE: tmpHome },
      }
    );

    expect(output).toContain('Successfully logged in to https://custom.codepush.dev');
    const rcPath = path.join(tmpHome, '.codepushrc.json');
    expect(fs.existsSync(rcPath)).toBe(true);
    const saved = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
    expect(saved.apiKey).toBe('cp_live_cli_test_999');
    expect(saved.serverUrl).toBe('https://custom.codepush.dev');
  });

  it('login exits with code 1 when --key is missing', () => {
    let exitCode = 0;
    try {
      execFileSync('node', [cliPath, 'login'], {
        encoding: 'utf8',
        env: { ...process.env, HOME: tmpHome, USERPROFILE: tmpHome },
        stdio: 'pipe',
      });
    } catch (err: any) {
      exitCode = err.status;
    }
    expect(exitCode).toBe(1);
  });
});

