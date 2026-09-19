# Getting Started

### Prerequisites

- Node.js 20.19 or newer
- A PostgreSQL database: a free [Neon](https://neon.tech) project, or local Postgres via Docker

### 1. Clone and install

```bash
git clone https://github.com/sriram18-m4/<repo-name>.git
cd <repo-name>
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
JWT_ACCESS_SECRET="any-random-string-at-least-32-characters"
JWT_REFRESH_SECRET="another-random-string-at-least-32-characters"
NODE_ENV="development"
```

### 3. Create the database tables

```bash
npx prisma db push --schema=backend/prisma/schema.prisma
```

### 4. Seed demo data

```bash
npm run prisma:seed
```

### 5. Start the app

```bash
npm run dev
```

Open http://localhost:3000. In the terminal you should see
`Connected to PostgreSQL database successfully via Prisma`.
If it says `running on resilient in-memory database store`, the app could not reach your database, so recheck `DATABASE_URL`.

### 6. Sign in

Use any account from the [Demo Accounts Credentials](#demo-accounts-credentials) table below.

## Demo Accounts Credentials

Password for all accounts: `Password123!`

| Role | Name | Email |
|---|---|---|
| Admin | Alexandra Vance | admin@agency.com |
| Project Manager | Marcus Chen | pm1@agency.com |
| Project Manager | Sarah Jenkins | pm2@agency.com |
| Developer | Ravi Patel | dev1@agency.com |
| Developer | Elena Rostova | dev2@agency.com |
| Developer | Liam O'Connor | dev3@agency.com |
| Developer | Amina Diallo | dev4@agency.com |
