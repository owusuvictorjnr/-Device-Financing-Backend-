# Device Financing Backend

NestJS backend for device financing, payment tracking, and device command workflows.

## Environment Setup

Copy `.env.example` to `.env` and fill real values.

Important notes:

- `.env` is runtime configuration (gitignored).
- `.env.example` is a template only.
- `DATABASE_URL` is required for DB commands (migrate/seed/deploy).

## Docker

### Production-style compose

Uses `docker-compose.yml` only (image artifacts, no source bind mounts).

```bash
docker compose -f docker-compose.yml up -d --build
```

### Local development compose

Uses `docker-compose.override.yml` for source bind mounts and API watch mode.

```bash
docker compose up -d --build
```

This command automatically loads both:

- `docker-compose.yml`
- `docker-compose.override.yml`

## Prisma Commands

Generate client:

```bash
yarn prisma:generate
```

Run migrations (skips auto-seed):

```bash
yarn prisma:migrate
```

Seed explicitly:

```bash
ALLOW_SEED=true SEED_INITIAL_PASSWORD='your_password' yarn prisma:seed
```

Optional seed password reset of existing seeded users:

```bash
ALLOW_SEED=true SEED_INITIAL_PASSWORD='your_password' SEED_RESET_PASSWORDS=true yarn prisma:seed
```

## Rate Limiting

Global endpoint rate limiting is enabled via `@nestjs/throttler`.

Tune values in env:

- `RATE_LIMIT_TTL_MS` (default `60000`)
- `RATE_LIMIT_MAX` (default `100`)

`/health` is excluded from throttling.

## CI

CI runs:

- dependency install
- Prisma generate
- build
- tests
- docker compose config validation
