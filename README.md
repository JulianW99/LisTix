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

## B2B and public ticket marketplace

The marketplace is available at `/marketplace` and contains only future tickets
whose LisTix status is `Active` or `Listed` and whose seller account is active.
Visitors can search events, compare listings and use the animated, illustrative
stadium section filter. Public `Purchase now` buttons stay disabled until Stripe
Checkout and webhook verification are implemented.

Inside an authenticated seller workspace the same route becomes the B2B view.
`Contact us to purchase` uses the signed-in account name, email and verified
Discord connection automatically; no contact form is shown. If a split rule
allows multiple quantities, the buyer selects only the quantity. The request
opens a private Discord channel for the member and Support role and sends the
listing, split rule, event, venue, seats, quantity and price as an embed. Open
tickets use category `1527371703087534110`; closing a ticket removes the member
permissions and moves it to category `1527371798625386608`. Support can reopen
it and restore those permissions.

Listings with more than one ticket require a split type: `Sell all together`,
`Only sell pairs`, `Sell any, but don't leave me with one`, `Sell any quantity`,
or `Sell one or all together`. The backend derives the permitted purchase
quantities from that rule and enforces them for both marketplace surfaces. The
inquiry table retains Stripe session and payment-state fields for the later
checkout integration.

### Venue maps

Marketplace events use venue-specific SVG seating maps stored as validated JSON
geometry in PostgreSQL. The public and B2B surfaces use LisTix's own dark,
multi-color map design, derive the lowest price badge from current listings and
filter inventory when a section is selected. No executable SVG markup or
third-party marketplace image is stored.

System staff with `system.maps.view` can open `/system/maps`. Staff with
`system.maps.manage` can choose Halo Bowl, End Stage, Compact Dome or Sports
Arena templates; drag section polygons, the floor and stage; resize and rotate
areas; map them to LisTix seat sections; and publish the result. Smart placement
first assigns new inventory sections to the nearest aligned template slot. The
contour tool evaluates every edge, neighboring block size, stadium curvature,
direction, collisions and free space before attaching a new polygon. Four-point
blocks can also be split into two perfectly adjoining sections. For fast manual
creation, admins can load a local PNG, JPG, WEBP or SVG plan as a temporary
tracing layer and click custom polygon points on top. The reference never leaves
the browser and is not saved. LisTix map JSON can be exported and imported for
reuse or later provider converters. Venues without a stored map receive a
generated editable layout until an administrator saves a customized version.

## System administration and automations

The system administrator account opens the platform-wide control area under
`/system`. It includes users and their Discord/Tikey/identity status, all sales
with both LisTix and marketplace IDs, listing distribution health, user payouts,
LisTix fees, support, and an action queue.

Selecting a user now opens `/system/users/:id` with the complete platform record:
contact and address data, service connections, identity status, payout settings,
points, listings, sales, payments, LisTix fees, payout totals and buyer-side B2B
requests. Users can be reactivated, suspended or banned from this page.

### User points and POD preparation

Delivery reliability is recorded once per sale in an immutable point ledger. A
user receives `+100` points when tickets are sent at least 48 hours before the
delivery deadline, `+80` at least 24 hours before, `+60` at least 12 hours before,
`+40` at least four hours before, and `+20` when sent before the deadline. Late
delivery yields `-25` up to six hours late, `-60` up to 24 hours late, and `-100`
after that. A sale canceled because the tickets were not delivered yields `-200`.

Users can see their current score and ledger under `/points`. Every sale detail
shows the exact deadline cutoffs for all point bands and the score that would be
earned if the tickets were sent now. The system user overview shows the same
score together with the user's lifetime net payout. Both values are exposed for
a future Payment on Delivery decision, but POD thresholds are deliberately not
evaluated until those business thresholds are configured.

### System team and marketplace controls

System administrators can invite staff under `/system/settings` and assign an
administrator, moderator, support, or viewer preset plus individual system
permissions. Roles can be changed later, and every system-admin API route checks
the corresponding view or manage permission.

The same page can pause one marketplace or all marketplace distribution. Before
pausing, LisTix snapshots each publication's exact state and, for the global
switch, whether the owning listing was active or draft. While disabled, the
marketplace and listing views show the paused state. Re-enabling restores only
the publications and listings that were active before the pause; previous drafts
and other states remain unchanged.

Configure the backend variables in `backend/.env.example` to enable live
automations:

- `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` allow the bot to create private
  `re-transfer-<sale-id>` text channels and send sale DMs. Re-transfer channels
  are created below category `1527348867572695192` by default. The bot needs
  Manage Channels and Manage Roles, plus View Channels, Send Messages, Embed
  Links, and Read Message History in that category.
- Interactive re-transfer tickets require the persistent backend process. The
  first channel message contains only the Close Ticket control; the detail
  message follows and mentions the seller. A separate message directly below it
  mentions the configured Support role and explains that Support is available
  for questions. Discord shows message buttons to every channel viewer, but the
  bot accepts ticket controls only from Discord administrators or members of the
  configured Support role.
  Confirmation removes the seller's channel overwrite, deletes the Close and
  confirmation messages, renames the channel to `completed-<order-number>`,
  resolves its LisTix action, and moves it to Completed Re-Transfers category
  `1527352095898861679`. The completion message contains a Re-Open Ticket button
  that restores the seller permissions and returns the channel to Re-Transfers.
- `DISCORD_B2B_PURCHASE_CATEGORY_ID` and
  `DISCORD_COMPLETED_B2B_PURCHASE_CATEGORY_ID` configure the open and completed
  B2B purchase categories. The same administrator/Support-only confirmation,
  close and reopen controls are used for these tickets.
- SMTP variables deliver sale, re-transfer, and missed-deadline emails.
- IMAP variables poll the marketplace mailbox. A recognized re-transfer email is
  matched against both sale ID types, persisted in the action log, sent to the
  user, and opened as a Discord ticket.
- `LISTIX_FEE_PERCENTAGE` controls the fee backfilled for sales that do not yet
  have an explicit stored fee amount (the current default is 8.9%).

The backend process checks overdue delivery deadlines and the IMAP inbox every
minute by default. For serverless deployments, call
`POST /api/system-admin/automation/poll-mailbox` from an authenticated scheduled
worker, or run the backend as a persistent service so the monitor stays active.
The Actions page also contains a test console that runs the same notification
code paths using a selected user's latest sale. If an integration is not
configured, the action remains visible and records the notification as skipped.
