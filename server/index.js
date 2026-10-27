import { createStore } from './store.js';
import { createApp } from './app.js';
import fs from 'node:fs';
import path from 'node:path';

const port = Number(process.env.PORT || 3001);
const store = createStore(process.env.DATA_FILE || path.join(process.cwd(), 'server/data/db.json'));
await store.persist();
const distDir = path.join(process.cwd(), 'dist');
const staticDir = fs.existsSync(path.join(distDir, 'index.html')) ? distDir : null;
createApp(store, { staticDir }).listen(port, () => console.log(`GlucoGuide listening on http://localhost:${port}`));
