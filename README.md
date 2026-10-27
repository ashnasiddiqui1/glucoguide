# GlucoGuide

**Track your readings. Understand your patterns. Stay prepared.**

GlucoGuide is a personal diabetes-management organizer for adults who want one private place to record glucose readings, user-entered medication schedules, meals, activities, and a downloadable glucose summary. It is a tracking and organizational aid—not a diagnostic, emergency, or treatment service.

**Source repository:** [github.com/ashnasiddiqui1/glucoguide](https://github.com/ashnasiddiqui1/glucoguide)

**Live application:** [glucoguide-aldx.onrender.com](https://glucoguide-aldx.onrender.com/)

> **Medical safety:** GlucoGuide does not diagnose conditions, recommend medication or insulin changes, or claim that a meal or activity caused a glucose result. For severe symptoms or a suspected emergency, seek emergency care immediately.

## Problem statement

People living with diabetes often split readings, medication schedules, meals, and activity records across paper notes, alarms, and unrelated apps. This makes it difficult to maintain a coherent history or prepare records for a healthcare discussion.

## Target users

Adults living with diabetes who want to organize and review their own health records in an understandable, non-clinical interface. The app stores only the minimum information required for tracking and does not include real patient data in the repository.

## Solution and core workflows

GlucoGuide provides a private, authenticated workspace where a person can:

1. Register, sign in, restore their session after refresh, and sign out.
2. Create, edit, search/filter, and delete glucose readings; see historical charts and saved-range notices.
3. Create medication schedules, review upcoming in-app events, and mark an event as taken or skipped.
4. Record meals and activities, then review those records in a personal journal.
5. Choose a reporting period, view calculated glucose statistics, and download only their own readings as a CSV.

This is more than basic CRUD: the API validates input independently, enforces record ownership, creates a non-duplicating schedule-event view, computes real report metrics, escapes CSV values, and produces target-range notices only when the user has saved a complete range.

## Key features

- HTTP-only signed cookie sessions and bcrypt password hashing.
- Server-side authorization for every private record.
- Persisted glucose, medication, dose-event, meal, and activity data.
- Zod validation, payload limits, Helmet security headers, and rate limiting on authentication routes.
- Responsive interface with loading, empty, success, validation, and error states.
- Neutral range notices based solely on the user's saved low/high targets.
- Historical charts, date/context filtering, summary metrics, and CSV export.
- Hash-based client routing so deployed static hosting does not require a route rewrite for internal tabs.

## Tech stack

- **Client:** React 18, Vite, React Router, Recharts, Lucide.
- **Server:** Node.js, Express, Zod, Helmet, bcryptjs, cookie-parser, express-rate-limit.
- **Persistence:** a small JSON-backed repository adapter. It is appropriate for a single-instance student deployment when the `DATA_FILE` location is mounted on persistent storage; a production-scale version should replace this adapter with a managed database.
- **Testing:** Node test runner and Supertest.

## Architecture

```text
React + Vite client
       │ /api (credentials included)
       ▼
Express API ── security middleware ── route validation ── ownership checks
       │                                                    │
       └────────── HTTP-only signed session cookie ─────────┘
                                                            ▼
                                               JSON persistence adapter
                                               (persistent mounted disk)
```

See [architecture documentation](docs/ARCHITECTURE.md) for collection relationships, security choices, and key business rules.

## Local setup

**Prerequisite:** Node.js 20 or later.

```bash
git clone <your-GitHub-repository-URL>
cd glucoguide
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. The development API runs on `http://localhost:3001`.

To build and run the single-service production setup locally:

```bash
npm run build
NODE_ENV=production npm start
```

Then open `http://localhost:3001`.

## Environment variables

Create `.env` from `.env.example`; never commit it.

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | No | API/server port; defaults to `3001`. |
| `SESSION_SECRET` | Yes in production | Long random secret used to sign authentication sessions. |
| `CLIENT_ORIGIN` | Yes for split frontend/API deployment | Exact permitted browser origin. |
| `NODE_ENV` | Yes in production | Enables secure session cookies in production. |
| `DATA_FILE` | Yes for durable deployment | Absolute path to a file on persistent storage. |

## Testing and verification

```bash
npm test
npm run build
```

The test suite covers account registration/login/logout, duplicate-registration protection, authentication enforcement, record ownership, target validation and alerts, glucose calculations, medication event status behavior, and CSV escaping/export.

## Deployment

The production build runs as a single Node.js web service: Express serves the compiled React client and REST API from the same origin. The included [Dockerfile](Dockerfile) supports container deployment. Persistent application records are stored at the configured `DATA_FILE` path, which must be backed by a persistent volume in production. The service exposes `/api/health` for monitoring.

Detailed deployment configuration is documented in [DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Originality and AI use

GlucoGuide was independently built for this end-term project using standard open-source libraries. AI assistance was used as an engineering aid for implementation, testing, debugging, and documentation; the submitted project must still be reviewed, understood, tested, deployed, and demonstrated by its author.
