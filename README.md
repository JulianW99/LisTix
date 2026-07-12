# LisTix

Ticket operations application with:

- `backend/`: Node.js, Express, Neon PostgreSQL and JWT cookie authentication
- `frontend/`: React, TypeScript, Vite and React Router

## Setup

Use Node.js 18 or newer. Install dependencies in both application folders:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Create the local environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Add the pooled Neon connection string to `backend/.env`:

```dotenv
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
DATABASE_SSL=true
```

The backend creates the schema and seeds initial data when it starts. Authentication remains in the Express backend and uses a signed JWT stored in an HTTP-only cookie. Neon is used only as PostgreSQL.

## Local Development

Start the backend:

```bash
cd backend
npm start
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open [http://localhost:4173](http://localhost:4173). The API health endpoint is available at [http://127.0.0.1:4010/api/health](http://127.0.0.1:4010/api/health).

The seeded admin credentials are controlled by `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`.

Additional demo accounts:

- `demo.alex@listix.local` / `DemoUser123!`
- `demo.jamie@listix.local` / `DemoUser123!`
- `demo.taylor@listix.local` / `DemoUser123!`
- `systemadmin@listix.local` / `SystemAdmin123!`

## Frontend Structure

- `src/Components/<Name>/`: each UI component and its same-named CSS file share one folder
- `src/Functions/`: reusable functions, one concern per file
- `src/Context/ApiContext.tsx`: route-driven API loading and normalized client-side entity caches
- `DataTable`: generic table component used by listings, sales and payments
- `BrowserRouter`: route-based navigation between application sections
