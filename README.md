# MiniShop

MiniShop is a containerized, three-tier web application demonstrating how a React frontend, an Express/TypeScript backend, and a PostgreSQL database can be built, deployed, and run together using Docker Compose.

The current interface displays a catalogue of technology products with their descriptions, prices, and available stock. Product information is retrieved from PostgreSQL through the backend API rather than being hard-coded into the frontend.



## Technology Stack

| Layer | Technologies | Purpose |
| --- | --- | --- |
| Frontend | React 19, TypeScript, Vite | Product catalogue interface |
| Frontend web server | Nginx (Alpine) | Serves the production frontend and proxies `/api/` requests |
| Backend | Node.js 24, Express 5, TypeScript | API endpoints and database queries |
| Database | PostgreSQL 17 | Stores product information |
| Deployment | Docker, Docker Compose | Builds and runs the application services |
| Version control | Git / GitHub | Source management and collaboration |



## Application Architecture

```text
Browser
  |
  | http://localhost:8080
  v
Frontend container (Nginx + compiled React application)
  |
  | /api/* -> http://backend:3000
  v
Backend container (Node.js + Express)
  |
  | PostgreSQL connection via service name `database`
  v
Database container (PostgreSQL 17)
  |
  v
Docker named volume: postgres_data
```

Docker Compose creates a shared internal network for the services. The frontend uses a relative `/api/products` request, and Nginx forwards API requests to the backend container. PostgreSQL data is stored in a named Docker volume so it survives normal container removal and recreation.

For local access, the Compose configuration binds the frontend, backend, and database ports to `127.0.0.1` (the host computer only).



## Project Structure

```text
MiniShop/
├── backend/
│   ├── src/
│   │   ├── db.ts             # PostgreSQL connection pool
│   │   └── server.ts         # Express routes and server setup
│   ├── Dockerfile            # Backend image build
│   ├── .dockerignore
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Product catalogue and API request
│   │   ├── App.css           # Catalogue styling
│   │   └── index.css
│   ├── public/
│   ├── Dockerfile            # Frontend build and Nginx image
│   ├── nginx.conf            # Static file serving and API proxy
│   ├── .dockerignore
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.ts
├── compose.yaml              # Three-service Docker Compose setup
├── .gitignore                # Excludes credentials and generated files
└── README.md                 # This guide
```

Additional frontend assets and configuration files are present but omitted from this abbreviated tree. Local `.env` files are intentionally not included in the repository.



## Prerequisites

- **Git**, to clone the repository.
- **Docker Desktop** with Docker Compose support, running successfully. On Windows, use Docker Desktop's WSL 2 backend where applicable.
- An available local port **8080** for the website. Ports **3000** and **5432** must also be available because they are published by the current Compose configuration.

Node.js and PostgreSQL do **not** need to be installed separately to run the fully containerized application. Docker builds the Node.js images and runs PostgreSQL in a container.



## Quick Start: Docker Compose

Run these commands in a terminal from the **MiniShop project root** (the directory containing `compose.yaml`).


### 1. Obtain the Source Code

```powershell
git clone <REPOSITORY_URL>
cd MiniShop
```

Replace `<REPOSITORY_URL>` with the actual GitHub clone URL after the repository has been published. If you already have the project folder, open a terminal in its root instead.


### 2. Configure the Database Password

Create a file named **`.env`** in the **project root**, alongside `compose.yaml`:

```dotenv
POSTGRES_PASSWORD=replace_with_a_unique_local_password
```

Use your own strong password. For this project's current `DATABASE_URL` format, prefer a password made from letters, digits, underscores, or hyphens; special URL characters require URL encoding in the connection string. Do not use the example value as a real password.

**Never commit, upload, or share real `.env` files.** The root `.gitignore` excludes them.

The backend container receives its database connection string from `compose.yaml`, using the password defined above. You do **not** need to create `backend/.env` for the Docker Compose workflow.


### 3. Build the Application Images

The supplied `compose.yaml` references locally tagged images, so build both application images before starting the stack:

```powershell
docker build -t minishop-backend:1.0 ./backend
docker build -t minishop-frontend:1.0 ./frontend
```

Docker Compose downloads the `postgres:17` image as needed.


### 4. Start the Services

```powershell
docker compose config --quiet
docker compose up -d
docker compose ps
```

Expected services:

| Service | Container | Host address |
| --- | --- | --- |
| Frontend | `minishop-frontend` | http://localhost:8080 |
| Backend | `minishop-backend` | http://localhost:3000 |
| Database | `minishop-postgres` | `127.0.0.1:5432` |

The database service has a health check. The backend waits for PostgreSQL to become healthy before starting.

**Important:** On a new computer or a new Docker volume, the database is initially empty. Complete the database initialization below before expecting the product catalogue to load.



## Initialize the PostgreSQL Database

The current repository does **not** include automatic schema creation, migrations, or data seeding. The following manual setup is required **once per new database volume**.

Open a PostgreSQL session inside the running database container:

```powershell
docker compose exec database psql -U minishop -d minishop
```

At the `minishop=#` prompt, run the following SQL to create the products table:

```sql
CREATE TABLE IF NOT EXISTS products (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Then insert the eight sample products **only if the table does not already contain them**:

```sql
INSERT INTO products (name, description, price, stock_quantity)
VALUES
    ('Wireless Mouse', 'Ergonomic wireless computer mouse.', 20.00, 36),
    ('Mechanical Keyboard', 'Compact mechanical keyboard.', 90.00, 19),
    ('USB-C Hub', 'Multi-port USB-C connectivity hub.', 50.00, 28),
    ('Laptop Stand', 'Adjustable aluminium laptop stand.', 40.00, 15),
    ('Bluetooth Headphones', 'Wireless over-ear headphones.', 80.00, 22),
    ('Portable SSD', 'Compact external solid-state storage drive.', 60.00, 44),
    ('Webcam', 'High-definition USB webcam for video calls.', 70.00, 32),
    ('Wireless Charger', 'Convenient wireless charging pad.', 30.00, 48);
```

Verify the records:

```sql
SELECT id, name, price, stock_quantity
FROM products
ORDER BY id;
```

The initial sample dataset should contain **8 rows**. Exit `psql` with:

```text
\q
```

**Note:** The insert operation is not automatically idempotent. Running it again adds duplicate product records. On an existing installation, verify the table contents before inserting sample data.



## Verify the Deployment

Open the following addresses in your browser:

| URL | Expected result |
| --- | --- |
| http://localhost:8080 | MiniShop product catalogue |
| http://localhost:8080/api/products | JSON response containing the products |
| http://localhost:3000/ | `Welcome to the MiniShop API!` message |
| http://localhost:3000/api/health | Backend status response |
| http://localhost:3000/api/db-health | Database connectivity response |
| http://localhost:3000/api/products | JSON product listing |

The `/api/products` response contains a `status`, `count`, and `products` array. After sample-data initialization, the expected count is **8**.

Useful terminal checks:

```powershell
docker compose ps
docker compose logs backend
docker compose logs frontend
docker compose logs database
```



## API Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/` | Welcome message from the backend when accessed on port 3000 |
| GET | `/api/health` | Backend service health response |
| GET | `/api/db-health` | Runs a simple PostgreSQL query to verify connectivity |
| GET | `/api/products` | Returns the available product catalogue |

The current API is **read-only**. Product creation, editing, deletion, authentication, carts, and checkout are **not implemented** in the uploaded version.



## Common Docker Commands

From the project root:

```powershell
# Show service status
docker compose ps

# Stop and remove the containers and Compose network
docker compose down

# Start the existing stack again
docker compose up -d

# Follow service logs
docker compose logs -f

# Inspect the database interactively
docker compose exec database psql -U minishop -d minishop
```

`docker compose down` **preserves** the named database volume by default. **Do not run `docker compose down -v` unless you intentionally want to delete the stored PostgreSQL data.**

After editing backend or frontend source code, rebuild the corresponding image and recreate its container. For example:

```powershell
docker build -t minishop-backend:1.0 ./backend
docker compose up -d --force-recreate backend
```

For frontend changes, replace `backend` with `frontend` and use the `minishop-frontend:1.0` image tag.



## Optional: Local Development without Containerizing Application Code

For development, you can run the PostgreSQL database in Docker and start the backend and frontend with Node.js on your computer. This requires a compatible Node.js installation and npm.

Start PostgreSQL:

```powershell
docker compose up -d database
```

Create a **`backend/.env`** file locally containing a connection string to the published host port:

```dotenv
DATABASE_URL=postgres://minishop:replace_with_your_local_password@localhost:5432/minishop
```

Use the same password as the root `.env` file. If the password includes URL-reserved characters, URL-encode the password component.

In one terminal:

```powershell
cd backend
npm ci
npm run dev
```

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

The Vite development server normally serves the frontend at **http://localhost:5173** and the backend runs at **http://localhost:3000**. The backend's CORS configuration allows the Vite development origin `http://localhost:5173`.

**Development routing note:** The current frontend requests the relative path `/api/products`, while the uploaded `vite.config.ts` has **no API proxy configured**. Therefore, this optional Vite workflow needs an additional Vite proxy configuration (or a development-only API URL change) before the product catalogue can fetch data. The recommended, verified deployment path is Docker Compose on port 8080.



## Troubleshooting

**The website opens but products do not load.** Confirm all containers are running, check `docker compose logs backend`, and verify the `products` table exists and contains records. Test `http://localhost:8080/api/products` to check the Nginx-to-backend proxy.

**The API returns an error for `/api/products`.** A new PostgreSQL volume may not have the `products` table yet. Complete the database initialization instructions above.

**Docker Compose reports that `POSTGRES_PASSWORD` is missing.** Create the root `.env` file next to `compose.yaml` and define `POSTGRES_PASSWORD`.

**A container cannot bind to a port.** Another application may already be using port 8080, 3000, or 5432. Stop the conflicting service or adjust the host-side port mapping in `compose.yaml`.

**A Docker image cannot be found.** Build both locally tagged application images using the commands in the Quick Start section.

**The database password changed but PostgreSQL still uses the old credentials.** PostgreSQL's initialization variables apply when its data directory is first created. Changing `.env` alone does not update credentials in an existing database volume. Preserve existing data and update the database role password deliberately; do not delete the volume as a routine fix.

**Source changes do not appear on port 8080.** Rebuild the affected Docker image and recreate its service container. The production frontend serves compiled files, not live Vite development files.



## Security and Data Persistence

- Keep passwords, API keys, and other credentials out of Git commits and shared ZIP archives.
- `.env` files are excluded by the root `.gitignore`, but manually created archives must exclude them separately.
- The published host ports are bound to `127.0.0.1`, so this Compose setup is intended for local use, not public internet deployment.
- PostgreSQL data persists in the Compose-managed named volume `postgres_data` across ordinary container restarts and `docker compose down`.
- Each collaborator can use their own local database password and volume. The repository shares application code and setup instructions, **not** an automatically synchronized database.



## Project Status

The current repository version of this project demonstrates a working three-service Docker deployment, database-backed product retrieval, health-check endpoints, and a styled eight-product catalogue when the sample database has been initialized. It is a development/assessment project, not a production-ready online store.