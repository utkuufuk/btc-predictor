# BTC Predictor

A one-minute BTC/USD prediction game.

https://btc-predictor-qujwotbrbq-ew.a.run.app

## Structure

- `packages/web`: React and Vite frontend
- `packages/api`: Node.js and Express backend
- `packages/common`: types and utilities shared by the frontend and backend
- `.github/workflows`: continuous integration and Cloud Run deployment

## Development

Use Node.js 22.22.2 and pnpm 11.22.0.

```sh
pnpm install
cp .env.example .env.local
gcloud auth application-default login
gcloud auth application-default set-quota-project <PROJECT_ID>
pnpm dev
```

Fill the root `.env.local` with the Firebase web app configuration.
Both the API and web development servers read this file automatically.

The frontend runs at <http://localhost:5173> and proxies `/api` requests to the backend at
<http://localhost:3000>.

## Checks

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Deployment

The app is deployed as one container on Google Cloud Run. Express serves both the API and the
compiled React app, so the deployment has one service and one public URL.

Pull requests and pushes to `main` run the checks in GitHub Actions.
Pushes to `main` build one container, publish it to Artifact Registry, and deploy it to Cloud Run.

## Player data

The browser signs in anonymously with Firebase and immediately prompts a new player for an alias.
The API verifies the player's ID token and stores the required alias and score in
`players/{firebaseUid}` in Firestore.

## Market data

The app reads BTC/USD prices from Coinbase's public Exchange ticker through the backend. While the
page is visible, the browser refreshes once per second; hidden or closed tabs make no requests. The
backend caches each quote for one second so concurrent visitors share the same upstream response.
