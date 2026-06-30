# Ticket Admin MVP

Standalone MVP with:

- `backend/`: Node.js + Express + PostgreSQL + JWT cookie auth
- `frontend/`: React + TypeScript + Vite admin interface

## Prerequisites

1. **Node.js**: We recommend using nvm to manage Node.js versions.
2. **Docker**: Install Docker Desktop.

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd LisTix
    ```

2.  **Set up environment variables:**
    Copy the example files. You usually don't need to change them for local development.
    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    ```

3.  **Start the database:**
    This command starts a PostgreSQL database in a Docker container.
    ```bash
    docker-compose up -d
    ```

4.  **Start the backend:**
    Open a new terminal.
    ```bash
    cd backend
    nvm use       # Activates the correct Node.js version
    npm install
    npm run dev
    ```

5.  **Start the frontend:**
    Open a third terminal.
    ```bash
    cd frontend
    nvm use       # Activates the correct Node.js version
    npm install
    npm run dev
    ```

On backend startup the app creates the `users` table if needed and seeds an admin user from the `.env` values.

## Default Admin Credentials

The seeded admin account is controlled by these backend environment variables:

- `ADMIN_EMAIL=admin@ticketadmin.local`
- `ADMIN_PASSWORD=ChangeMe123!`

Change them before using this outside local development.
