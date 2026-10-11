# RK86 online loader

Production: https://rk86.vercel.app (Vercel project `me-default/rk86`).

Go service for the terminal emulator’s `--online` option. The original Deno
`main.ts` is retained unchanged for reference.

The Go service uses the official MongoDB Go driver. It runs a normal `main.go` HTTP server on `PORT` (default `8000`), with Vercel's
Go framework preset, Fluid compute, and the London region. Deploy **this
`loader/` directory** as a separate Vercel project, not the emulator repository
root. There is no `api/` directory.

## API

- `POST /load`: JSON `{ "binary": "<base64>", "name": "FILE.RK" }` returns
  `{ "id": "<6 lowercase letters/digits>" }`.
- `GET /file/<name>?<id>`: returns the original bytes with
  `application/octet-stream` and an attachment filename. The path's name is
  only a hint for the emulator's file parser; lookup uses the **bare query
  string**, not `?id=...`.
- `GET /`: returns `rk86 loader`.
- `GET /favicon.ico`: serves the embedded icon copied from `static/favicon.ico`
  in the main project, with a one-day cache lifetime. Also supports `HEAD`.
- `OPTIONS` on any path: returns 204 with permissive CORS, including POST.

Uploads expire 60 seconds after storage. Downloads neither delete files nor
extend their expiry. Upload/download responses use `Cache-Control: no-store` so an intermediary
cannot serve files beyond that expiry. The JSON request body is limited to
4 MiB (including base64 and filename); larger requests return 413. Invalid
JSON, field types, base64, or empty binaries return 400. Missing or expired
IDs return 404. Storage failures return 500.

## Shared storage

The Go version replaces Deno KV with MongoDB, using the `loader` collection in
`MONGODB_NAME`. Each document contains `_id` (the six-character upload ID),
`name`, `data` (BSON binary, without base64 overhead), and `expiresAt` (a BSON
date). Atomic inserts use MongoDB's unique `_id` index to prevent overwrites;
ID collisions retry.

At startup the service creates the `loader_expiry` TTL index on `expiresAt`
with `expireAfterSeconds: 0`. MongoDB removes expired documents asynchronously;
downloads also check `expiresAt` so files stop being available after 60 seconds,
even before cleanup runs. The database user needs permission to read, insert,
and create indexes in the collection. Use separate databases for production
and previews.

Configuration matches the existing `loader/.env`:

- `MONGODB_URI`: MongoDB connection URI.
- `MONGODB_NAME`: database name; collection is always `loader`.

The service automatically loads `.env` from the working directory, without
overriding existing environment variables. On Vercel, set the same variables
in project settings. `.env` is excluded from Git and Vercel uploads. Startup
fails if configuration is missing or the TTL index cannot be initialized.

```sh
cd loader
just                      # tests + build
just dev                  # http://localhost:8000
just test                 # race-enabled tests, no external credentials needed
just build                # creates ./exe
just clean                # removes ./exe
```

Smoke test against the local server:

```sh
curl -sS http://localhost:8000/load \
  -H 'Content-Type: application/json' \
  -d '{"binary":"AAH+/w==","name":"TEST.RK"}'
# Substitute the returned ID, within 60 seconds:
curl -i 'http://localhost:8000/file/TEST.RK?<id>'
```

## Vercel deployment

1. The project is already created. From a fresh checkout, run
   `vercel link --yes --project rk86 --scope me-default` inside `loader/`.
   For Git-based deployment, set its Root Directory to `loader` instead.
2. Set `MONGODB_URI` and `MONGODB_NAME` for the target environment. Ensure
   MongoDB network access permits connections from the deployment and the
   database user can create the TTL index in the `loader` collection.
3. From `loader/`, run `just deploy` (`vercel deploy --prod`). Deployments are
   CLI uploads; no Git integration is configured. Deployment protection is
   disabled so the CLI and emulator can access the public endpoints.
4. Repeat the upload/download smoke test against the assigned HTTPS URL and
   verify a download returns 404 after 60 seconds.

The terminal source and checked-in CLI bundle use `https://rk86.vercel.app`.
After future CLI changes, rebuild with `just terminal-build`; publishing a new
npm version is a separate step via the terminal release workflow.

HTTP contract tests use a shared in-memory fake; BSON tests verify binary
storage. Run an opt-in integration test against the database in `.env` with:

```sh
LOADER_MONGO_INTEGRATION=1 go test -race -run TestMongoIntegration -v .
```

The integration test creates the TTL index and a uniquely named test document
in `loader`, verifies cross-client reads, collision protection and expiry, and
removes its test document. It does not modify other documents or deploy to Vercel.

References: [Vercel Go backends](https://vercel.com/changelog/zero-configuration-go-backend-support),
[MongoDB TTL indexes](https://www.mongodb.com/docs/manual/core/index-ttl/).
