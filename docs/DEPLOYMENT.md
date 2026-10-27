# Deployment guide

## Deployment prerequisite

This project needs a Node.js host that supports a persistent volume or disk. Do **not** deploy it as a serverless function or a static-only site: session-backed API routes and the JSON persistence file need one long-running Node process and durable storage.

You will need:

- A GitHub repository containing this project.
- A Node/Docker host with a persistent disk attached.
- A randomly generated `SESSION_SECRET` (for example, output from `openssl rand -base64 48`).

## Deploy a single service

1. Push the `glucoguide` directory to a new GitHub repository.
2. Create a new Node/Docker web service from that repository.
3. Build with `npm ci && npm run build` and start with `npm start`. Alternatively, build using the included `Dockerfile`.
4. Attach a persistent disk/volume. Set `DATA_FILE` to an absolute file path on that disk, for example `/data/glucoguide-db.json`.
5. Set these environment variables in the provider's secret/configuration UI:

   ```text
   NODE_ENV=production
   SESSION_SECRET=<long-random-secret>
   DATA_FILE=/data/glucoguide-db.json
   PORT=<provider-port-if-required>
   ```

   `CLIENT_ORIGIN` is only necessary when the client is hosted separately. For the recommended single-service setup, set it to the final public app URL.

6. Deploy, then open `<your-public-url>/api/health`. It must return `{ "ok": true }`.
7. In a private/incognito browser window, create a new account, add a reading, refresh, sign out/sign in, and download the report. Confirm the data persists after a service restart if your provider lets you restart safely.

## Pre-submission security check

- [ ] `.env` and `server/data/db.json` are ignored by Git.
- [ ] `SESSION_SECRET` is unique, strong, and set only in the host's secret manager.
- [ ] The public deployment uses HTTPS.
- [ ] `/api/health` works.
- [ ] The app, repository, and demo video URLs are publicly accessible in an incognito window.

## Docker local verification

```bash
docker build -t glucoguide .
docker run --rm -p 3001:3001 \
  -e SESSION_SECRET="replace-this-for-local-testing" \
  -e DATA_FILE=/data/db.json \
  -v "$(pwd)/.local-data:/data" \
  glucoguide
```

Open `http://localhost:3001` after the container starts.
