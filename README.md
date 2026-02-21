# Indian Mutual Funds POC

A simple web application to browse Indian mutual funds, search by name, and view fund details with returns and risk metrics.

## Tech Stack

- **Frontend:** React (Vite)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (for caching)
- **Scheduler:** node-cron (for daily sync)
- **Data Source:** PulseDB API

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for PostgreSQL)

### 1. Start PostgreSQL

```bash
docker-compose up -d
```

### 2. Setup Backend

```bash
cd backend
npm install

# Copy environment file and add your PulseDB credentials
cp .env.example .env

# Seed the database with sample data
npm run seed

# Start the server
npm run dev
```

Backend runs on http://localhost:3001

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/funds | List funds with search & pagination |
| GET | /api/funds/:schemeCode | Get fund details with returns |
| GET | /api/categories | List all fund categories |
| POST | /api/sync | Trigger manual data sync |
| GET | /health | Health check |

### Example Queries

```bash
# List funds
curl "http://localhost:3001/api/funds"

# Search funds
curl "http://localhost:3001/api/funds?search=axis"

# Filter by category
curl "http://localhost:3001/api/funds?category=Equity"

# Get fund details
curl "http://localhost:3001/api/funds/INF846K01DP8"

# Get categories
curl "http://localhost:3001/api/categories"
```

## Environment Variables

```env
# Database
DATABASE_URL=postgres://mfuser:mfpassword@localhost:5432/mfdb

# PulseDB API
PULSEDB_BASE_URL=https://pulsedb-qa.pulselabs.co.in
PULSEDB_API_KEY=your-api-key
PULSEDB_API_SECRET=your-api-secret

# Server
PORT=3001
```

## Features

- Browse mutual funds with pagination
- Search funds by name (case-insensitive)
- Filter by category (Equity, Debt, Hybrid)
- View fund details with 1Y, 3Y, 5Y returns
- Daily automatic sync at 9 PM IST
- Sample data seeding for development

## Project Structure

```
indian-mf-app/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express app entry
│   │   ├── config/
│   │   │   └── db.js             # PostgreSQL connection
│   │   ├── routes/
│   │   │   └── funds.js          # Fund API routes
│   │   ├── services/
│   │   │   ├── pulsedbService.js # PulseDB API client
│   │   │   └── syncService.js    # Data sync logic
│   │   ├── jobs/
│   │   │   └── dailySync.js      # Cron job setup
│   │   ├── scripts/
│   │   │   └── seed.js           # Database seeder
│   │   └── middleware/
│   │       └── errorHandler.js   # Error handling
│   ├── init.sql                  # Database schema
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   └── FundDetail.jsx
│   │   ├── components/
│   │   │   ├── FundCard.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   └── Pagination.jsx
│   │   └── services/
│   │       └── api.js            # API client
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml            # PostgreSQL for local dev
└── README.md
```
