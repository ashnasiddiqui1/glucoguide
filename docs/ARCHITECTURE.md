# Architecture

## Product boundary

GlucoGuide is deliberately limited to personal record organization. It does not diagnose, predict emergencies, recommend medication doses, or attribute a glucose change to a particular meal or activity.

## Components

| Component | Responsibility |
|---|---|
| React client | Forms, navigation, charts, accessible feedback, and authenticated API calls. |
| Express API | Authentication, input validation, authorization, calculations, reports, and error responses. |
| Repository adapter | Reads and writes persisted JSON data in a single configured file. |
| Business module | Pure glucose statistics, target notices, CSV escaping, and upcoming-dose projection. |

In production, Express serves the built client and API from one origin. This avoids cross-origin cookie problems and keeps deployment simple for a student project.

## Data relationships

```text
User (1) ──── (*) GlucoseLog
   │
   ├────────── (*) Medication (1) ──── (*) DoseEvent
   ├────────── (*) MealLog
   └────────── (*) ActivityLog
```

Every private record includes `userId`. The API always derives the authenticated user from the signed HTTP-only cookie and uses `userId` in read, update, and delete queries. The browser cannot supply a different owner ID.

## Important engineering decisions

### Authentication and privacy

- Passwords are hashed with bcrypt (work factor 12) and are never returned to the client.
- Sessions are signed with HMAC, sent as HTTP-only `SameSite=Lax` cookies, and become `Secure` in production.
- Helmet sets protective HTTP headers. Request bodies are limited to 100 KB.
- Authentication endpoints are rate limited. Zod validates all write payloads.

### Persistence

The JSON repository is purposely small and transparent for local demos. It writes atomically enough for one application process, so a production service must run a single app instance and use a persistent volume (`DATA_FILE`). It is not suitable for horizontally scaled production traffic. A future upgrade path is a database-backed repository implementing the same interfaces.

### Medication events

A medication schedule is not a dose event. The `upcomingEvents` calculation projects schedule times over a bounded period and uses a deterministic `medicationId:scheduledTimestamp` event key. Saving `taken` or `skipped` creates/updates one persisted dose event for that key, which avoids duplicate events when the dashboard loads again.

### Glucose metrics and notices

Report values are calculated only from persisted numeric readings in the selected inclusive date range. Empty sets return null metrics, never zero. A range notice exists only when both user-entered target values are present and internally consistent. Its language is neutral and references the user's clinician action plan rather than providing treatment advice.

### Error handling

Controllers return human-readable 400/401/404/409 responses. A centralized final handler hides unexpected internal errors. The client displays requests that fail rather than reporting false success.
