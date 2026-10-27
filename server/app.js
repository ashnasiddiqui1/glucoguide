import express from 'express';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { cookieName, sessionOptions, sign, verify } from './auth.js';
import { glucoseCsv, inRangeAlert, stats, upcomingEvents } from './business.js';

const contexts = ['fasting', 'before-meal', 'after-meal', 'other'];
const categories = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
const isoDate = z.string().datetime({ offset: true }).refine((v) => new Date(v) <= new Date(), 'Time cannot be in the future');
const text = (max) => z.string().trim().min(1).max(max);
const optionalText = (max) => z.string().trim().max(max).optional().default('');
const glucoseSchema = z.object({ value: z.coerce.number().positive().max(2000), unit: z.literal('mg/dL'), context: z.enum(contexts), measuredAt: isoDate, note: optionalText(500) });
const mealSchema = z.object({ description: text(140), category: z.enum(categories), carbohydrates: z.coerce.number().min(0).max(1000).nullable().optional(), loggedAt: isoDate, note: optionalText(500) });
const activitySchema = z.object({ name: text(140), duration: z.coerce.number().int().min(1).max(1440).nullable().optional(), loggedAt: isoDate, note: optionalText(500) });
const medicationSchema = z.object({ name: text(140), instructions: text(500), times: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).min(1).max(6), startDate: z.string().date(), endDate: z.string().date().nullable().optional(), active: z.boolean().optional().default(true) }).refine((m) => !m.endDate || m.endDate >= m.startDate, 'End date must be on or after start date');

function publicUser(user) { return { id: user.id, email: user.email, displayName: user.displayName, settings: user.settings || {} }; }
function httpError(status, message) { const e = new Error(message); e.status = status; return e; }
function parse(schema, body) { const result = schema.safeParse(body); if (!result.success) throw httpError(400, result.error.issues[0].message); return result.data; }
function range(rows, query, field) { const { start, end } = query; if (start && !z.string().date().safeParse(start).success) throw httpError(400, 'Start date must use YYYY-MM-DD'); if (end && !z.string().date().safeParse(end).success) throw httpError(400, 'End date must use YYYY-MM-DD'); if (start && end && start > end) throw httpError(400, 'Start date must be before end date'); return rows.filter((r) => (!start || r[field] >= `${start}T00:00:00.000Z`) && (!end || r[field] <= `${end}T23:59:59.999Z`)); }
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function createApp(store, { sessionSecret = process.env.SESSION_SECRET || 'development-only-change-me', staticDir = null } = {}) {
  const app = express();
  app.disable('x-powered-by'); app.use(helmet({ crossOriginResourcePolicy: false }));
  const clientOrigin = process.env.CLIENT_ORIGIN;
  app.use(cors(clientOrigin ? { origin: clientOrigin, credentials: true } : { origin: false }));
  app.use(express.json({ limit: '100kb' })); app.use(cookieParser());
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }));
  app.use(async (req, _res, next) => { const id = verify(req.cookies[cookieName], sessionSecret); req.user = id ? await store.find('users', (u) => u.id === id) : null; next(); });
  const requireUser = (req, _res, next) => req.user ? next() : next(httpError(401, 'Please sign in to continue'));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.post('/api/auth/register', wrap(async (req, res) => {
    const input = parse(z.object({ email: z.string().trim().email().max(254), displayName: text(80), password: z.string().min(8).max(128), confirmation: z.string() }), req.body);
    if (input.password !== input.confirmation) throw httpError(400, 'Passwords do not match');
    const email = input.email.toLowerCase(); if (await store.find('users', (u) => u.email === email)) throw httpError(409, 'An account already exists for that email');
    const user = await store.insert('users', { email, displayName: input.displayName, passwordHash: await bcrypt.hash(input.password, 12), settings: { lowTarget: null, highTarget: null } });
    res.cookie(cookieName, sign(user.id, sessionSecret), sessionOptions()).status(201).json({ user: publicUser(user) });
  }));
  app.post('/api/auth/login', wrap(async (req, res) => { const input = parse(z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) }), req.body); const user = await store.find('users', (u) => u.email === input.email.toLowerCase()); if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw httpError(401, 'Email or password is incorrect'); res.cookie(cookieName, sign(user.id, sessionSecret), sessionOptions()).json({ user: publicUser(user) }); }));
  app.post('/api/auth/logout', (_req, res) => res.clearCookie(cookieName, { path: '/' }).status(204).end());
  app.get('/api/auth/me', requireUser, (req, res) => res.json({ user: publicUser(req.user) }));

  function ownedList(collection, field, extra = () => true) { return wrap(async (req, res) => { let rows = (await store.all(collection)).filter((r) => r.userId === req.user.id && extra(r, req)); rows = range(rows, req.query, field); const sort = req.query.sort === 'asc' ? 1 : -1; rows.sort((a, b) => sort * a[field].localeCompare(b[field])); const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50)); res.json({ records: rows.slice((page - 1) * limit, page * limit), total: rows.length, page, limit }); }); }
  function createRecord(collection, schema) { return wrap(async (req, res) => res.status(201).json({ record: await store.insert(collection, { userId: req.user.id, ...parse(schema, req.body) }) })); }
  function updateRecord(collection, schema) { return wrap(async (req, res) => { const record = await store.update(collection, req.params.id, (r) => r.userId === req.user.id, parse(schema, req.body)); if (!record) throw httpError(404, 'Record not found'); res.json({ record }); }); }
  function deleteRecord(collection) { return wrap(async (req, res) => { if (!await store.remove(collection, req.params.id, (r) => r.userId === req.user.id)) throw httpError(404, 'Record not found'); res.status(204).end(); }); }

  app.get('/api/glucose', requireUser, ownedList('glucose', 'measuredAt', (r, req) => !req.query.context || r.context === req.query.context)); app.post('/api/glucose', requireUser, createRecord('glucose', glucoseSchema)); app.patch('/api/glucose/:id', requireUser, updateRecord('glucose', glucoseSchema)); app.delete('/api/glucose/:id', requireUser, deleteRecord('glucose'));
  app.get('/api/meals', requireUser, ownedList('meals', 'loggedAt', (r, req) => !req.query.category || r.category === req.query.category)); app.post('/api/meals', requireUser, createRecord('meals', mealSchema)); app.patch('/api/meals/:id', requireUser, updateRecord('meals', mealSchema)); app.delete('/api/meals/:id', requireUser, deleteRecord('meals'));
  app.get('/api/activities', requireUser, ownedList('activities', 'loggedAt')); app.post('/api/activities', requireUser, createRecord('activities', activitySchema)); app.patch('/api/activities/:id', requireUser, updateRecord('activities', activitySchema)); app.delete('/api/activities/:id', requireUser, deleteRecord('activities'));
  app.get('/api/medications', requireUser, wrap(async (req, res) => { const records = (await store.all('medications')).filter((r) => r.userId === req.user.id).sort((a, b) => a.name.localeCompare(b.name)); res.json({ records }); })); app.post('/api/medications', requireUser, createRecord('medications', medicationSchema)); app.patch('/api/medications/:id', requireUser, updateRecord('medications', medicationSchema)); app.delete('/api/medications/:id', requireUser, deleteRecord('medications'));
  app.get('/api/dose-events', requireUser, wrap(async (req, res) => { const meds = (await store.all('medications')).filter((m) => m.userId === req.user.id); const events = (await store.all('doseEvents')).filter((e) => e.userId === req.user.id); res.json({ records: upcomingEvents(meds, events) }); }));
  app.post('/api/dose-events/:id/status', requireUser, wrap(async (req, res) => { const status = parse(z.object({ status: z.enum(['taken', 'skipped']) }), req.body).status; const [medicationId, ...dateParts] = req.params.id.split(':'); const scheduledAt = dateParts.join(':'); const med = await store.find('medications', (m) => m.id === medicationId && m.userId === req.user.id); if (!med || Number.isNaN(new Date(scheduledAt).valueOf())) throw httpError(404, 'Dose event not found'); const eventKey = req.params.id; const existing = await store.find('doseEvents', (e) => e.userId === req.user.id && e.eventKey === eventKey); const record = existing ? await store.update('doseEvents', existing.id, (e) => e.userId === req.user.id, { status, completedAt: new Date().toISOString() }) : await store.insert('doseEvents', { userId: req.user.id, medicationId, eventKey, scheduledAt, status, completedAt: new Date().toISOString() }); res.json({ record }); }));

  app.get('/api/settings', requireUser, (req, res) => res.json({ settings: req.user.settings || {} }));
  app.patch('/api/settings', requireUser, wrap(async (req, res) => { const input = parse(z.object({ displayName: z.string().trim().min(1).max(80).optional(), lowTarget: z.coerce.number().positive().max(2000).nullable().optional(), highTarget: z.coerce.number().positive().max(2000).nullable().optional() }), req.body); const settings = { ...req.user.settings, ...('lowTarget' in input ? { lowTarget: input.lowTarget } : {}), ...('highTarget' in input ? { highTarget: input.highTarget } : {}) }; if ((settings.lowTarget == null) !== (settings.highTarget == null)) throw httpError(400, 'Enter both target values or leave both blank'); if (settings.lowTarget != null && settings.lowTarget >= settings.highTarget) throw httpError(400, 'The low target must be less than the high target'); const user = await store.update('users', req.user.id, () => true, { displayName: input.displayName || req.user.displayName, settings }); res.json({ user: publicUser(user) }); }));

  app.get('/api/dashboard/summary', requireUser, wrap(async (req, res) => { const glucose = (await store.all('glucose')).filter((r) => r.userId === req.user.id).sort((a, b) => b.measuredAt.localeCompare(a.measuredAt)); const meals = (await store.all('meals')).filter((r) => r.userId === req.user.id).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)); const activities = (await store.all('activities')).filter((r) => r.userId === req.user.id).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)); const medications = (await store.all('medications')).filter((r) => r.userId === req.user.id); const doseEvents = (await store.all('doseEvents')).filter((r) => r.userId === req.user.id); const today = new Date().toISOString().slice(0, 10); const alerts = glucose.slice(0, 20).map((r) => inRangeAlert(r, req.user.settings)).filter(Boolean); res.json({ latest: glucose[0] || null, todayCount: glucose.filter((r) => r.measuredAt.slice(0, 10) === today).length, chart: glucose.slice(0, 30).reverse(), recentMeals: meals.slice(0, 4), recentActivities: activities.slice(0, 4), upcoming: upcomingEvents(medications, doseEvents).slice(0, 5), alerts }); }));
  app.get('/api/reports/glucose', requireUser, wrap(async (req, res) => { const records = range((await store.all('glucose')).filter((r) => r.userId === req.user.id), req.query, 'measuredAt').sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)); res.json({ records, statistics: stats(records), explanation: 'Average, minimum, and maximum are calculated from the recorded glucose values in the selected date range.' }); }));
  app.get('/api/reports/export.csv', requireUser, wrap(async (req, res) => { const records = range((await store.all('glucose')).filter((r) => r.userId === req.user.id), req.query, 'measuredAt').sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)); res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="glucoguide-readings.csv"' }).send(glucoseCsv(records)); }));

  app.use('/api', (_req, _res, next) => next(httpError(404, 'Route not found')));
  if (staticDir) {
    app.use(express.static(staticDir));
    app.get('*', (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }
  app.use((_req, _res, next) => next(httpError(404, 'Route not found'))); app.use((err, _req, res, _next) => { if (err instanceof SyntaxError && 'body' in err) err = httpError(400, 'Invalid JSON'); const status = err.status || 500; if (status >= 500) console.error('Unexpected server error', err.message); res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : err.message }); });
  return app;
}
