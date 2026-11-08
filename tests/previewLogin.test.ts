import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewLoginEnabled } from '../src/lib/previewLogin';

const DEV = 'https://quixotic-quail-572.convex.cloud';
function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const keys = ['VERCEL_ENV', 'CLERK_SECRET_KEY', 'NEXT_PUBLIC_CONVEX_URL'];
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  for (const k of keys) { if (env[k] === undefined) delete process.env[k]; else process.env[k] = env[k]; }
  try { fn(); } finally { for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } }
}

test('one-tap test login is on only for preview/dev builds on dev Clerk + dev Convex', () => {
  withEnv({ VERCEL_ENV: 'preview', CLERK_SECRET_KEY: 'sk_test_x', NEXT_PUBLIC_CONVEX_URL: DEV }, () => assert.equal(previewLoginEnabled(), true));
  withEnv({ VERCEL_ENV: undefined, CLERK_SECRET_KEY: 'sk_test_x', NEXT_PUBLIC_CONVEX_URL: DEV }, () => assert.equal(previewLoginEnabled(), true));
});

test('one-tap test login can never turn on for production', () => {
  withEnv({ VERCEL_ENV: 'production', CLERK_SECRET_KEY: 'sk_test_x', NEXT_PUBLIC_CONVEX_URL: DEV }, () => assert.equal(previewLoginEnabled(), false));
  withEnv({ VERCEL_ENV: 'preview', CLERK_SECRET_KEY: 'sk_live_x', NEXT_PUBLIC_CONVEX_URL: DEV }, () => assert.equal(previewLoginEnabled(), false));
  withEnv({ VERCEL_ENV: 'preview', CLERK_SECRET_KEY: 'sk_test_x', NEXT_PUBLIC_CONVEX_URL: 'https://valuable-loris-929.convex.cloud' }, () => assert.equal(previewLoginEnabled(), false));
});
