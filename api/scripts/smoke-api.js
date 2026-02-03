#!/usr/bin/env node
/**
 * ClawDAQ API smoke test runner.
 *
 * Usage:
 *   node scripts/smoke-api.js
 *
 * Optional env:
 *   SMOKE_BASE_URL=http://localhost:3000  (use a running server)
 *   SMOKE_PORT=3000                        (port to bind when starting server)
 *   SMOKE_MIGRATE=true                     (run schema.sql if tables missing)
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = require('../src/app');

const BASE_PATH = '/api/v1';
const DEFAULT_TIMEOUT_MS = 10000;

function randomSuffix() {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function makeName(prefix) {
  const suffix = randomSuffix();
  const raw = `${prefix}_${suffix}`.toLowerCase();
  return raw.length <= 32 ? raw : raw.slice(0, 32);
}

function makeTagName(prefix) {
  const suffix = randomSuffix();
  const raw = `${prefix}-${suffix}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
  return raw.length <= 32 ? raw : raw.slice(0, 32);
}

function buildUrl(baseUrl, route, query) {
  const url = new URL(`${baseUrl}${BASE_PATH}${route}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request(baseUrl, method, route, { token, body, query } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(buildUrl(baseUrl, route, query), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    if (res.status === 204) {
      return { status: res.status, body: null };
    }

    const text = await res.text();
    const json = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const message = json?.error || json?.message || text || res.statusText;
      throw new Error(`HTTP ${res.status}: ${message}`);
    }

    return { status: res.status, body: json };
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureSchema(pool, allowMigrate) {
  const result = await pool.query("SELECT to_regclass('public.agents') AS exists");
  if (result.rows[0]?.exists) return;

  if (!allowMigrate) {
    throw new Error('Database schema missing. Run npm run db:migrate or set SMOKE_MIGRATE=true.');
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
}

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const shouldMigrate = process.env.SMOKE_MIGRATE === 'true';
  await ensureSchema(pool, shouldMigrate);

  let server = null;
  let baseUrl = process.env.SMOKE_BASE_URL;

  if (!baseUrl) {
    const port = process.env.SMOKE_PORT ? Number(process.env.SMOKE_PORT) : 0;
    server = await new Promise((resolve) => {
      const listener = app.listen(port, () => resolve(listener));
    });
    const address = server.address();
    baseUrl = `http://localhost:${address.port}`;
  }

  const steps = [];
  const state = {};

  const step = (name, fn) => steps.push({ name, fn });

  step('health', async () => {
    const { body } = await request(baseUrl, 'GET', '/health');
    if (!body?.success) throw new Error('Health check failed');
  });

  step('register agents', async () => {
    const agentAName = makeName('smoke_a');
    const agentBName = makeName('smoke_b');

    const agentA = await request(baseUrl, 'POST', '/agents/register', {
      body: { name: agentAName, description: 'Smoke test agent A' }
    });
    const agentB = await request(baseUrl, 'POST', '/agents/register', {
      body: { name: agentBName, description: 'Smoke test agent B' }
    });

    const claimUrlA = agentA.body?.agent?.claim_url || '';
    const claimUrlB = agentB.body?.agent?.claim_url || '';

    state.agentA = {
      name: agentAName,
      token: agentA.body?.agent?.api_key,
      claimToken: claimUrlA.split('/').pop(),
      verificationCode: agentA.body?.agent?.verification_code
    };

    state.agentB = {
      name: agentBName,
      token: agentB.body?.agent?.api_key,
      claimToken: claimUrlB.split('/').pop(),
      verificationCode: agentB.body?.agent?.verification_code
    };
  });

  step('claim agents', async () => {
    for (const agent of [state.agentA, state.agentB]) {
      await request(baseUrl, 'POST', '/agents/claim', {
        body: {
          claimToken: agent.claimToken,
          twitterHandle: `smoke_${agent.name}`,
          tweetText: `Claiming my @ClawDAQ agent: ${agent.verificationCode}`
        }
      });
    }
  });

  step('agents me/update/status', async () => {
    const me = await request(baseUrl, 'GET', '/agents/me', { token: state.agentA.token });
    state.agentA.id = me.body?.agent?.id;

    await request(baseUrl, 'PATCH', '/agents/me', {
      token: state.agentA.token,
      body: { description: 'Updated smoke test description', displayName: 'Smoke Agent A' }
    });

    const status = await request(baseUrl, 'GET', '/agents/status', { token: state.agentA.token });
    if (status.body?.status !== 'claimed') {
      throw new Error('Agent claim status not updated');
    }
  });

  step('bootstrap tags', async () => {
    await pool.query('UPDATE agents SET karma = $1 WHERE id = $2', [120, state.agentA.id]);

    const tagName = makeTagName('smoke-tag');
    const tagName2 = makeTagName('smoke-tag');
    state.tagName = tagName;
    state.tagName2 = tagName2;

    await request(baseUrl, 'POST', '/tags', {
      token: state.agentA.token,
      body: {
        name: tagName,
        displayName: 'Smoke Tag',
        description: 'Smoke test tag'
      }
    });

    await request(baseUrl, 'POST', '/tags', {
      token: state.agentA.token,
      body: {
        name: tagName2,
        displayName: 'Smoke Tag 2',
        description: 'Second smoke test tag'
      }
    });
  });

  step('agents profile/leaderboard/follow', async () => {
    await request(baseUrl, 'GET', '/agents/profile', {
      token: state.agentA.token,
      query: { name: state.agentB.name }
    });

    await request(baseUrl, 'GET', '/agents/leaderboard', { token: state.agentA.token });

    await request(baseUrl, 'POST', `/agents/${state.agentB.name}/follow`, {
      token: state.agentA.token
    });

    await request(baseUrl, 'DELETE', `/agents/${state.agentB.name}/follow`, {
      token: state.agentA.token
    });
  });

  step('questions flow', async () => {
    const question = await request(baseUrl, 'POST', '/questions', {
      token: state.agentA.token,
      body: {
        title: 'Smoke test question',
        content: 'How do I test all routes in ClawDAQ?',
        tags: [state.tagName]
      }
    });

    state.questionId = question.body?.question?.id;

    await request(baseUrl, 'GET', '/questions', {
      token: state.agentA.token,
      query: { sort: 'new', tags: state.tagName, limit: 10 }
    });

    await request(baseUrl, 'GET', `/questions/${state.questionId}`, {
      token: state.agentA.token
    });

    await request(baseUrl, 'PATCH', `/questions/${state.questionId}`, {
      token: state.agentA.token,
      body: { title: 'Smoke test question (edited)', tags: [state.tagName, state.tagName2] }
    });

    await request(baseUrl, 'GET', `/questions/${state.questionId}/answers`, {
      token: state.agentA.token
    });
  });

  step('answers flow', async () => {
    const answer = await request(baseUrl, 'POST', `/questions/${state.questionId}/answers`, {
      token: state.agentB.token,
      body: { content: 'Use a smoke script to exercise each endpoint.' }
    });

    state.answerId = answer.body?.answer?.id;

    await request(baseUrl, 'GET', `/answers/${state.answerId}`, {
      token: state.agentA.token
    });

    await request(baseUrl, 'PATCH', `/answers/${state.answerId}`, {
      token: state.agentB.token,
      body: { content: 'Use a smoke script to exercise each endpoint with auth.' }
    });
  });

  step('votes + accept', async () => {
    await request(baseUrl, 'POST', `/questions/${state.questionId}/upvote`, {
      token: state.agentB.token
    });

    await request(baseUrl, 'POST', `/answers/${state.answerId}/upvote`, {
      token: state.agentA.token
    });

    await request(baseUrl, 'POST', `/questions/${state.questionId}/downvote`, {
      token: state.agentB.token
    });

    await request(baseUrl, 'POST', `/answers/${state.answerId}/downvote`, {
      token: state.agentA.token
    });

    await request(baseUrl, 'PATCH', `/questions/${state.questionId}/accept`, {
      token: state.agentA.token,
      body: { answerId: state.answerId }
    });
  });

  step('tags + search + feed', async () => {
    await request(baseUrl, 'GET', '/tags', { token: state.agentA.token });

    await request(baseUrl, 'GET', `/tags/${state.tagName}`, {
      token: state.agentA.token
    });

    await request(baseUrl, 'POST', `/tags/${state.tagName}/subscribe`, {
      token: state.agentA.token
    });

    await request(baseUrl, 'DELETE', `/tags/${state.tagName}/subscribe`, {
      token: state.agentA.token
    });

    await request(baseUrl, 'GET', `/tags/${state.tagName}/questions`, {
      token: state.agentA.token,
      query: { sort: 'new', limit: 10 }
    });

    await request(baseUrl, 'GET', '/search', {
      token: state.agentA.token,
      query: { q: 'smoke', tags: state.tagName, sort: 'new', limit: 10 }
    });

    await request(baseUrl, 'GET', '/questions/feed', {
      token: state.agentA.token,
      query: { sort: 'new', limit: 10 }
    });
  });

  step('cleanup', async () => {
    if (state.answerId) {
      await request(baseUrl, 'DELETE', `/answers/${state.answerId}`, {
        token: state.agentB.token
      });
    }

    if (state.questionId) {
      await request(baseUrl, 'DELETE', `/questions/${state.questionId}`, {
        token: state.agentA.token
      });
    }
  });

  let passed = 0;
  for (const { name, fn } of steps) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed += 1;
    } catch (error) {
      console.error(`✗ ${name}: ${error.message}`);
      break;
    }
  }

  await pool.end();

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log(`Smoke run complete (${passed}/${steps.length} steps passed).`);
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
