# LisTix

Ticket operations application with:

- `backend/`: Node.js, Express, Neon PostgreSQL and JWT cookie authentication
- `frontend/`: React, TypeScript, Vite and React Router

## Start everything with one command

Docker Compose runs PostgreSQL, the backend, and the frontend together. The
commands below assume the terminal is opened in the outer `LisTix` workspace
folder (`...\\Visual Studio Code Projects\\LisTix`), as in the PowerShell examples.

```powershell
docker compose -f .\LisTix\docker-compose.yml up --build -d
```

Open [http://localhost:4173](http://localhost:4173). To stop all three services:

```powershell
docker compose -f .\LisTix\docker-compose.yml down
```

To restart and rebuild all three services after code or configuration changes:

```powershell
docker compose -f .\LisTix\docker-compose.yml up --build -d --force-recreate
```

`docker compose -f .\LisTix\docker-compose.yml down` keeps the PostgreSQL volume, so user data remains available
the next time the stack starts.

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
In local development, the same credentials are prefilled on the login page via
`VITE_DEMO_ADMIN_EMAIL` and `VITE_DEMO_ADMIN_PASSWORD`. Production builds leave
the fields empty unless those variables are deliberately provided.

Additional demo accounts:

- `demo.alex@listix.local` / `DemoUser123!`
- `demo.jamie@listix.local` / `DemoUser123!`
- `demo.taylor@listix.local` / `DemoUser123!`
- `systemadmin@listix.local` / `SystemAdmin123!`

Each demo account owns a different explicit set of listings. Sales reference those
account-owned listings, and payments are derived only from the current account's
sales. Account settings are stored on the account; personal display names stay on
the user. All reads and writes for listings, sales, payments and account settings
are scoped using the authenticated account ID.

Set `SEED_DEMO_DATA=false` in a production environment to keep the core admin users
and shared lookup data while skipping demo users, listings, sales, payments, and
support tickets. A future signup flow creates a user, an account and its owner
membership. New listings automatically receive that account ID, keeping all related
sales, payments, settings and activity separated from other accounts.

## Landing page and team access

The public landing page is available at `/`; `/login` opens the account login.
Multi-user support can be enabled under Settings → Team & Access. Owners can create
seven-day invitation links, assign role presets or individual permissions, change
member status, and review the account activity log. Invited users choose their own
password at `/invite/:token`.

For local use, invitation links point to `http://localhost:4173`. Set `FRONTEND_URL`
to the public HTTPS origin in production. The current UI can copy an invitation link
or open a prepared email. Automatic delivery requires connecting an SMTP or
transactional email provider.

## Frontend Structure

- `src/Components/<Name>/`: each UI component and its same-named CSS file share one folder
- `src/Functions/`: reusable functions, one concern per file
- `src/Context/ApiContext.tsx`: route-driven API loading and normalized client-side entity caches
- `DataTable`: generic table component used by listings, sales and payments
- `BrowserRouter`: route-based navigation between application sections
