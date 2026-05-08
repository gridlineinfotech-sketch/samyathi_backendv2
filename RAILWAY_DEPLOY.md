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

- `db:prepare` uses `prisma db push` for the fastest setup on a fresh Railway Postgres database.
- If you keep `FILE_STORAGE_PROVIDER=local`, attach a Railway volume mounted at `/app/uploads`.
- If you use Google OAuth, set `GOOGLE_CALLBACK_URL` to `https://your-backend-domain/api/auth/google/callback`.
