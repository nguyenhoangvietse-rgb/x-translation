# Translation Library Worker

Cloudflare Worker serving a Vietnamese translation library — reader UI and admin panel backed by R2 storage.

## Prerequisites

- [Node.js](https://nodejs.org/) (18+)
- [Cloudflare account](https://dash.cloudflare.com/) (for R2 and deployment)

## Setup

```bash
cd worker
npm install
npx wrangler login
```

### Environment variables

Fill `.dev.vars` with your GitHub token (required for dispatch triggers):

```
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

## Run locally

```bash
# Local R2 emulation (offline storage)
npm run dev

# Or connect to the real R2 bucket online
npx wrangler dev --remote
```

Opens at **http://localhost:8787**.

## Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/` | Library page — lists all translated novels |
| `GET`  | `/read/:name` | Novel detail — chapter list and intro |
| `GET`  | `/read/:name/:id` | Chapter reader |
| `GET`  | `/admin` | Admin panel |
| `GET`  | `/api/books` | Admin book list (HTMX partial) |
| `POST` | `/api/upload` | Upload raw `.txt` book (max 50 MB) |
| `POST` | `/api/process/:name` | Dispatch chapter-split workflow |
| `POST` | `/api/translate/:name` | Dispatch translation workflow |
| `POST` | `/api/retranslate/:name/:id` | Re-translate a single chapter |
| `POST` | `/api/stop/:name` | Stop translation for a book |
| `GET `  | `/cover/:name` | Serve cover image |
| `POST` | `/api/cover/:name` | Upload cover image (max 2 MB) |

## R2 bucket structure

```
raw/         — uploaded raw .txt files
processed/   — split chapters (info.json, chapter files, cover images)
translated/  — translated chapters + metadata.json
```

## Deployment

```bash
npm run deploy
```
