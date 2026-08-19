import { createApp } from './app.js';

// oxlint-disable-next-line node/no-process-env
const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);
const app = createApp();

app.listen(PORT, () => {
  process.stdout.write(`API listening on http://localhost:${PORT}\n`);
});
