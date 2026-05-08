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
