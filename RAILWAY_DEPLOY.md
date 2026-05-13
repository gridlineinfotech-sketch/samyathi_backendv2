# Railway Deploy

## Services

- Create one Railway service for this backend repo
- Add one PostgreSQL service
- Add one Redis service

## Backend Variables

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=replace-with-a-long-random-secret
APP_URL=https://your-backend-domain.up.railway.app
FRONTEND_URL=https://your-frontend-domain
CORS_ORIGINS=https://your-frontend-domain
TRUST_PROXY=1
FILE_STORAGE_PROVIDER=local
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me-now
ADMIN_NAME=Pilgrim Admin
```

Add SMTP, Stripe, AWS S3, Cloudinary, and Google OAuth variables only if you are using those features.

## Railway Commands

- Build command: `npm run build`
- Start command: `npm run start:prod`
- Pre-deploy command: `npm run db:prepare`

## Notes

- `db:prepare` runs `prisma migrate deploy` and then the admin seed, so the database setup matches the checked-in PostgreSQL migration history.
- If Railway is still launching with `npx prisma migrate deploy && node dist/main`, update the service command or redeploy the latest commit. The repo no longer uses the old SQLite migration history.
- If you keep `FILE_STORAGE_PROVIDER=local`, attach a Railway volume mounted at `/app/uploads`.
- If you use Google OAuth, set `GOOGLE_CALLBACK_URL` to `https://your-backend-domain/api/auth/google/callback`.

## Local Development

- Railway private hosts like `postgres.railway.internal` and `redis.railway.internal` do not work from your local machine.
- For local runs, set `DATABASE_PUBLIC_URL` and `REDIS_PUBLIC_URL` from your Railway database TCP proxy values, or set `DATABASE_URL_LOCAL` and `REDIS_URL_LOCAL` to your own local services.
- The app now prefers the public/local variables automatically when `DATABASE_URL` or `REDIS_URL` point to Railway private networking outside Railway.
- Redis falls back to in-memory storage in non-production if no reachable Redis instance is available. This keeps OTP and cache flows usable during local development, but it is not persistent and should not be used for production.
