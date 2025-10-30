# Xmrit - Statistical Process Control Dashboard

Inspired by [xmrit.com](https://xmrit.com) by Commoncog, this is a self-hosted dashboard platform for Statistical Process Control (SPC) using XMR (X-bar and Moving Range) charts. Deploy your own instance to monitor metrics, detect process variations, and make data-driven decisions across your organization.

> **New to XMR Charts?** See the [XMRit User Manual](https://xmrit.com/manual/) by Commoncog for concepts, detection rules, trend analysis, and best practices.

## ✨ Features

**XMR Chart Analysis**

- Automatic control limits (UNPL, LNPL, URL) with Western Electric Rules violation detection
- Outlier detection (IQR, Z-Score, MAD, Percentile, Consensus)
- Locked limits with modification tracking
- Trend analysis with linear regression and dynamic limits
- Seasonality detection (yearly, quarterly, monthly, weekly)

**Platform**

- Workspace/slide organization with metric hierarchies
- Dark/light theme, responsive design
- NextAuth.js with Google OAuth
- Metrics ingestion API for automation
- Interactive charts (Recharts + Radix UI)

## 📚 Documentation

Comprehensive feature documentation is available in the [`docs/`](./docs) folder:

- **[Documentation Index](./docs/README.md)** - Complete guide to all features
- **[Controller Logic (Traffic Light)](./docs/CONTROLLER_TRAFFIC_LIGHT.md)** - Process control status indicators
- **[Data Ingestion API](./docs/DATA_INGESTION.md)** - REST API for programmatic data ingestion
- **[Auto Lock Limit](./docs/AUTO_LOCK_LIMIT.md)** - Automatic outlier detection and removal
- **[Lock Limit](./docs/LOCK_LIMIT.md)** - Manual limit locking and customization
- **[Trend Lines](./docs/TREND_LINES.md)** - Linear trend analysis with dynamic limits
- **[Seasonality](./docs/DESEASONALISATION.md)** - Seasonal pattern removal and adjustments

Each document includes detailed explanations, use cases, implementation details, best practices, and troubleshooting guides.

## 🚀 Quick Start

**Prerequisites:** Node.js 20+, PostgreSQL ([Neon](https://neon.tech) recommended), Google OAuth credentials

**1. Install**

```bash
git clone <your-repo-url>
cd xmrit-hub
npm install
```

**2. Environment Setup**

Create `.env` file:

```env
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"  # openssl rand -base64 32

GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

METRICS_API_KEY="your-metrics-api-key"  # openssl rand -hex 32 (min 32 chars) this is your api key for data ingestion
```

Get Google OAuth credentials:

1. [Google Cloud Console](https://console.cloud.google.com) → Create project
2. Enable Google+ API → Create OAuth 2.0 Client ID
3. Add redirect URI: `http://localhost:3000/api/auth/callback/google`

**3. Database & Run**

```bash
npm run db:generate  # Generate migrations
npm run db:migrate   # Apply migrations
npm run dev          # Start server → http://localhost:3000
```

## 📁 Project Structure

```
src/
├── app/
│   ├── [workspaceId]/                # Workspace dashboard & slide management
│   │   └── slide/[slideId]/          # XMR chart components (X-chart, MR-chart, dialogs)
│   ├── api/                          # API routes
│   │   ├── auth/[...nextauth]/       # NextAuth
│   │   ├── ingest/metrics/           # Data ingestion
│   │   ├── slides/[slideId]/         # Slide CRUD
│   │   └── workspaces/               # Workspace management
│   └── auth/                         # Auth pages
├── lib/
│   ├── xmr-calculations.ts           # Core XMR algorithms
│   ├── api/                          # API client layer
│   ├── db/                           # Schema & connection (Drizzle)
│   └── auth.ts                       # NextAuth config
├── components/ui/                    # Radix UI components
└── types/                            # TypeScript definitions
```

## 🛠️ Available Scripts

| Command               | Description                             |
| --------------------- | --------------------------------------- |
| `npm run dev`         | Start development server with Turbopack |
| `npm run build`       | Build for production                    |
| `npm run start`       | Start production server                 |
| `npm run lint`        | Run Biome linter                        |
| `npm run format`      | Format code with Biome                  |
| `npm run db:generate` | Generate database migrations            |
| `npm run db:migrate`  | Apply migrations to database            |
| `npm run db:push`     | Push schema changes to database         |
| `npm run db:studio`   | Open Drizzle Studio (database GUI)      |
| `npm run db:reset`    | Reset database (⚠️ destructive)         |

## 🔧 Data Ingestion API

Programmatically ingest data from data warehouses, ETL pipelines (n8n, Zapier, Airflow), BI tools (Metabase, Tableau), or any HTTP-capable system.

**Endpoint:** `POST /api/ingest/metrics`

```bash
Authorization: Bearer YOUR_METRICS_API_KEY
Content-Type: application/json
```

**Payload Example:**

```json
{
  "workspace_id": "uuid",
  "slide_title": "Q4 2024 Weekly Business Review",
  "slide_date": "2024-10-30",
  "metrics": [
    {
      "metric_name": "Revenue",
      "submetrics": [
        {
          "label": "[North America] - Revenue",
          "category": "North America",
          "timezone": "America/Los_Angeles",
          "xaxis": "week",
          "trend": "up",
          "data_points": [
            { "timestamp": "2024-01-01", "value": 125000 },
            { "timestamp": "2024-01-08", "value": 132000 }
          ]
        }
      ]
    }
  ]
}
```

**Fields:** `workspace_id` (UUID), `slide_title` (creates/updates), `slide_date` (YYYY-MM-DD), `metrics[].metric_name`, `submetrics[].label/category/timezone/xaxis/trend`, `data_points[].timestamp/value`

### n8n + Metabase Integration - Ingestion Example

Included `n8n.json` workflow: Extract from Metabase → Transform → Ingest into XMRit

**Setup:**

1. Import `n8n.json` to your n8n instance
2. Configure Metabase auth & collection ID
3. Set Bearer token to your `METRICS_API_KEY`
4. Set workspace ID
5. Run manually or scheduled

**Features:** Auto date calculation, batch processing, retry logic, dynamic metric extraction, multi-dimension support. Adaptable to other data sources.

## 🚀 Deployment

**Vercel (Recommended):** Push to GitHub → Import to [Vercel](https://vercel.com) → Add env vars → Deploy

## 🤝 Contributing

Fork → Create branch → Commit → Push → Open PR

## 📝 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Acknowledgments

Based on SPC principles (Walter A. Shewhart), Western Electric Rules, XMR methodology (Donald J. Wheeler), and [xmrit.com](https://xmrit.com) by Commoncog

---

Built with ❤️ for data-driven decision making
