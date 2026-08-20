# BTC Predictor

A one-minute BTC/USD prediction game. Follow this link to play:
https://btc-predictor-qujwotbrbq-ew.a.run.app

## How the game works

This is a one-minute prediction game in which players guess whether the BTC/USD price will move 
up or down. New players sign in anonymously, choose an availability-checked alias, and start with 
a score of zero; their identity and score persist so they can close the browser and continue later.
The latest BTC/USD price and current score remain visible throughout the game.

After submitting an up or down guess, the player cannot submit another until it is resolved. Once
at least 60 seconds have elapsed, the guess resolves against the first subsequent BTC/USD price that
differs from the entry price: a correct guess adds one point and an incorrect guess subtracts one,
after which the updated score is persisted and the player can guess again.

Prices come from Coinbase through the backend and refresh every second while the page is visible.
The rolling chart shows the most recent 60 seconds of price history. While a guess is active, its
line, the price text, and the direction arrow are green or red according to whether the latest price
is above or below the guess's entry price; otherwise, the price and chart remain neutral.

## Structure

- `packages/web`: React and Vite frontend
- `packages/api`: Node.js and Express backend
- `packages/common`: types and utilities shared by the frontend and backend
- `.github/workflows`: continuous integration and Cloud Run deployment

## Development

Use Node.js v22 and pnpm v11.

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

### One-time GCP and Firebase setup

1. Create a Google Cloud project, and attach a billing account.
2. Install and authenticate the Google Cloud and Firebase CLIs locally, then select the new project
   as the active project.
3. Enable the Cloud Run, Artifact Registry, IAM, IAM Service Account Credentials, Security Token
   Service, Firestore, Firebase Rules, and Identity Toolkit APIs.
4. Create a Docker repository in Artifact Registry for the application's images.
5. Add Firebase to the existing Google Cloud project and register a Firebase Web app.
6. Enable Anonymous sign-in in Firebase Authentication.
7. Create the default Firestore database in Native mode.
8. Create a dedicated Cloud Run runtime service account and grant it the Firestore data-access role
   `Cloud Datastore User`.
9. Create a separate GitHub deployer service account and grant it `Cloud Run Developer`, `Service
   Usage Consumer`, and `Firebase Rules Admin` at project level.
10. Grant the deployer `Artifact Registry Writer` on the image repository and `Service Account User`
    on the runtime service account.
11. Create a GitHub Actions Workload Identity pool and OIDC provider whose attribute condition limits
    authentication to this repository's `main` branch.
12. Allow identities from this GitHub repository to impersonate the deployer service account with
    `Workload Identity User`.
13. Add `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_ARTIFACT_REPOSITORY`, `GCP_CLOUD_RUN_SERVICE`,
    `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, and `GCP_RUNTIME_SERVICE_ACCOUNT` as
    GitHub Actions variables, using the provider's full resource name.
14. Add `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, and `VITE_FIREBASE_APP_ID` as GitHub
    Actions variables; `GCP_PROJECT_ID` also supplies the Firebase project ID.
15. Keep direct Firestore client access denied in `firestore.rules` so all player operations pass
    through the authenticated API.
16. Run the deployment workflow once to publish the first image and create the Cloud Run service.
17. Disable the Cloud Run invoker IAM check for that service so the application has a publicly
    accessible URL.

## Player data

The browser signs in anonymously with Firebase and immediately prompts a new player for an alias.
The API verifies the player's ID token and stores the required alias and score in
`players/{firebaseUid}` in Firestore.

Firebase Anonymous Auth creates a unique user ID without asking for credentials and persists the
session in the browser, so returning players keep their score; clearing site data or using another
browser creates a new anonymous player. Because the app has no account recovery mechanism, the
previous player document then remains orphaned in Firestore.

## Market data

The app reads BTC/USD prices from Coinbase's public Exchange ticker through the backend. While the
page is visible, the browser refreshes once per second; hidden or closed tabs make no requests. The
backend caches each quote for one second so concurrent visitors share the same upstream response.
