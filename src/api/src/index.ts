import express from 'express'
import { fileURLToPath } from 'node:url'

// Deployment platforms provide the listening port at runtime.
// oxlint-disable-next-line node/no-process-env
const PORT = Number.parseInt(process.env.PORT ?? '3000', 10)
const WEB_ROOT = fileURLToPath(new URL('../../web/dist', import.meta.url))
const WEB_INDEX = fileURLToPath(new URL('../../web/dist/index.html', import.meta.url))
const app = express()

app.disable('x-powered-by')
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'Not found' })
})

app.use(express.static(WEB_ROOT))

app.get('/{*path}', (_request, response) => {
  response.sendFile(WEB_INDEX)
})

app.listen(PORT, () => {
  process.stdout.write(`API listening on http://localhost:${PORT}\n`)
})
