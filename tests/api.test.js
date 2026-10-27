import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import request from 'supertest';
import { createStore } from '../server/store.js';
import { createApp } from '../server/app.js';

async function setup() { const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'glucoguide-')); const app = createApp(createStore(path.join(dir, 'db.json')), { sessionSecret:'test-secret' }); return { app, dir }; }
test('account lifecycle, private records, report export, and ownership enforcement', async () => {
  const { app, dir } = await setup(); const agent = request.agent(app);
  const registration = { email:'person@example.com', displayName:'Person', password:'password123', confirmation:'password123' };
  const registered = await agent.post('/api/auth/register').send(registration).expect(201);
  assert.equal(registered.body.user.email, registration.email);
  await request(app).post('/api/auth/register').send(registration).expect(409);
  const saved = await agent.post('/api/glucose').send({ value:130, unit:'mg/dL', context:'fasting', measuredAt:'2026-10-26T08:00:00.000Z', note:'Morning, "fasting"' }).expect(201);
  await agent.get('/api/dashboard/summary').expect(200).expect((res) => assert.equal(res.body.latest.value, 130));
  const exported = await agent.get('/api/reports/export.csv?start=2026-10-01&end=2026-10-31').expect(200);
  assert.match(exported.text, /"Morning, ""fasting"""/);
  const other = request.agent(app); await other.post('/api/auth/register').send({ email:'other@example.com', displayName:'Other', password:'password123', confirmation:'password123' }).expect(201);
  await other.patch('/api/glucose/'+saved.body.record.id).send({ value:120, unit:'mg/dL', context:'fasting', measuredAt:'2026-10-26T08:00:00.000Z', note:'' }).expect(404);
  await agent.post('/api/auth/logout').expect(204); await agent.get('/api/glucose').expect(401);
  await fs.rm(dir, { recursive:true, force:true });
});
test('login rejects bad credentials and settings validate complete ranges', async () => {
  const { app, dir } = await setup(); const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ email:'person@example.com', displayName:'Person', password:'password123', confirmation:'password123' }).expect(201);
  await agent.post('/api/auth/logout').expect(204);
  await agent.post('/api/auth/login').send({ email:'person@example.com', password:'wrong' }).expect(401);
  await agent.post('/api/auth/login').send({ email:'person@example.com', password:'password123' }).expect(200);
  await agent.patch('/api/settings').send({ lowTarget:80, highTarget:null }).expect(400);
  await agent.patch('/api/settings').send({ lowTarget:80, highTarget:140 }).expect(200);
  await fs.rm(dir, { recursive:true, force:true });
});
