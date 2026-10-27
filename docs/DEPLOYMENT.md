# Deployment

GlucoGuide deploys as one Node.js web service. The web interface and API are served together, and the included Render Blueprint (`render.yaml`) configures its build command, health check, and secure session secret.

## Render deployment

1. Push the repository to GitHub.
2. Sign in to Render and select **New → Blueprint**.
3. Connect `ashnasiddiqui1/glucoguide` and select its `main` branch.
4. Review the detected `glucoguide` web service, then create it. Render reads `render.yaml` automatically.
5. The included Blueprint uses Render's free plan.
6. Wait for the deployment to finish. Open the generated `https://<service>.onrender.com/api/health` URL and confirm it responds with `{"ok":true}`.
7. Open the application URL in a private/incognito window. Create a synthetic test account, save a reading, refresh, sign out and in again, then download a CSV report.

Render creates `SESSION_SECRET` automatically from the Blueprint. Do not add it to GitHub.

> **Free-plan limitation:** Free Render services use temporary filesystem storage. GlucoGuide records will work during the running deployment, but they can be lost when Render restarts or redeploys the service. For durable long-term storage, the app needs a managed database or a paid persistent disk.
