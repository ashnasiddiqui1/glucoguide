# Deployment

GlucoGuide deploys as one Node.js web service. The web interface and API are served together, and the included Render Blueprint (`render.yaml`) configures its build command, health check, secure session secret, and persistent data path.

## Render deployment

1. Push the repository to GitHub.
2. Sign in to Render and select **New → Blueprint**.
3. Connect `ashnasiddiqui1/glucoguide` and select its `main` branch.
4. Review the detected `glucoguide` web service, then create it. Render reads `render.yaml` automatically.
5. Select a paid web-service plan: Render persistent disks are available only to paid services. The attached disk is required to retain health records when the service restarts or redeploys.
6. Wait for the deployment to finish. Open the generated `https://<service>.onrender.com/api/health` URL and confirm it responds with `{"ok":true}`.
7. Open the application URL in a private/incognito window. Create a synthetic test account, save a reading, refresh, sign out and in again, then download a CSV report.

Render creates `SESSION_SECRET` automatically from the Blueprint. Do not add it to GitHub. The application data is stored at `/var/data/glucoguide.json` on the attached persistent disk.
