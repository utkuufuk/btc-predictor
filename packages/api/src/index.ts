import { createApp } from './app.js';

const app = createApp();

// oxlint-disable-next-line node/no-process-env
const port = Number.parseInt(process.env.PORT ?? '3000', 10);

app.listen(port, () => {
  process.stdout.write(`API listening on port ${port}\n`);
});
