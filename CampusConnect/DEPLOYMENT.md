# CampusConnect Deployment

## MongoDB Atlas

1. Create a MongoDB Atlas cluster.
2. Create a database user.
3. Add your current IP for local testing, or `0.0.0.0/0` for managed hosting.
4. Copy the connection string into `backend/.env` as `MONGO_URI`.

## Render Backend

Set these environment variables in Render:

- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRE=7d`
- `FRONTEND_URL=https://your-campusconnect.vercel.app`

Use:

- Build command: `npm install`
- Start command: `npm start`
- Root directory: `CampusConnect/backend`

## Vercel Frontend

Set this environment variable in Vercel:

- `VITE_API_URL=https://your-campusconnect-api.onrender.com/api`

Use:

- Framework preset: Vite
- Root directory: `CampusConnect/frontend`
- Build command: `npm run build`
- Output directory: `dist`

## Seed Sample Users

After Atlas is connected:

```bash
cd backend
npm run seed
```
