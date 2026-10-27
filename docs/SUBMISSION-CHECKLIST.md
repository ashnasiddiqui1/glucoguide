# Submission checklist

Last audited: 27 October 2026.

## Verified in the repository

- [x] Functional application with real client/server workflows.
- [x] Clearly defined problem, target users, and safety boundary in the README.
- [x] Authentication, password hashing, signed HTTP-only session cookies, and server-side private-record authorization.
- [x] Persistent storage for a single running instance.
- [x] Meaningful logic: validations, range notices, schedule-event projection/statuses, metrics, filtering, and CSV export.
- [x] Empty, loading, validation, network-error, and destructive-action confirmation states in primary workflows.
- [x] No committed environment file or generated record store; placeholders only in `.env.example`.
- [x] Automated tests for core server/business behavior and a production client build.
- [x] README, architecture document, deployment guide, and demo script.

## Required before final form submission

- [ ] Create a dedicated GitHub repository for this project and push the code.
- [ ] Ensure the repository contains only GlucoGuide files and no `.env`/real records.
- [ ] Deploy it to a host with a persistent disk/volume and record its public URL.
- [ ] Complete the incognito-window deployment smoke test in [DEPLOYMENT.md](DEPLOYMENT.md).
- [ ] Record and upload a 3–5 minute demo using [DEMO-SCRIPT.md](DEMO-SCRIPT.md).
- [ ] Put verified GitHub, deployment, and video links into `README.md`.
- [ ] Fill out the official form with the final details.

## Final form copy

| Field | Value to submit |
|---|---|
| Project Name | GlucoGuide |
| Student Name | _Enter your name_ |
| Problem Statement | Adults managing diabetes may have readings, medication schedules, meals, and activity details split across disconnected tools. GlucoGuide organizes these private records in one safety-conscious tracker. |
| GitHub Repository | _Paste verified public repository URL_ |
| Deployed Application / Build | _Paste verified public application URL_ |
| Demo Video | _Paste verified public video URL_ |
| Tech Stack | React, Vite, Express, Node.js, Zod, bcryptjs, signed HTTP-only cookies, JSON persistence, Recharts, Node test runner/Supertest. |
| Major Features | Private accounts; glucose tracking/charts/filters; user-entered medication scheduling and dose status; meal/activity journals; range notices; reports and CSV export. |
