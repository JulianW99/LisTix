# Ticket Admin MVP

Standalone MVP with:

- `backend/`: Node.js + Express + PostgreSQL + JWT cookie auth
- `frontend/`: React + TypeScript + Vite admin interface

## Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Update the PostgreSQL credentials so they match your local database.
3. Copy `frontend/.env.example` to `frontend/.env` if you want to override the API URL.
4. Start the backend with `npm run dev` inside `backend/`.
5. Start the frontend with `npm run dev` inside `frontend/`.

On backend startup the app creates the `users` table if needed and seeds an admin user from the `.env` values.

## Default Admin Credentials

The seeded admin account is controlled by these backend environment variables:

- `ADMIN_EMAIL=admin@ticketadmin.local`
- `ADMIN_PASSWORD=ChangeMe123!`

Change them before using this outside local development.
