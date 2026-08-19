# BTC Predictor

A one-minute BTC/USD prediction game.

## Structure

- `src/web`: React and Vite frontend
- `src/api`: Node.js and Express backend
- `.github/workflows`: continuous integration and Cloud Run deployment

## Development

Use Node.js 22.22.2 and pnpm 11.22.0.

```sh
pnpm install
pnpm dev
```

The frontend runs at <http://localhost:5173> and proxies `/api` requests to the backend at
<http://localhost:3000>.

## Checks

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```

## Deployment

The app is deployed as one container on Google Cloud Run. Express serves both the API and the
compiled React app, so the deployment has one service and one public URL.

Pull requests and branch pushes run the checks in GitHub Actions. 
Pushes to `main` build one container, publish it to Artifact Registry, and deploy it to Cloud Run.
