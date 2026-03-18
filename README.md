# PulseCheck

Live presentation polls and surveys -- run questions one at a time for an audience and see results instantly.

## Quick Start

```bash
# Install dependencies
npm install

# Copy env file and set your admin credentials
cp .env.example .env

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the audience view and [http://localhost:3000/admin](http://localhost:3000/admin) to manage questions.

## Environment Variables

| Variable         | Description            | Default    |
| ---------------- | ---------------------- | ---------- |
| `ADMIN_USERNAME` | Admin login username   | `admin`    |
| `ADMIN_PASSWORD` | Admin login password   | `changeme` |

Create a `.env` file in the project root (see `.env.example`).

## How It Works

1. **Admin** logs in at `/admin`, creates questions with 2-6 answer options.
2. **Admin** opens a question -- it goes live instantly for all connected audience tabs.
3. **Audience** at `/` sees the question and votes (single choice).
4. **Admin** closes the question -- results appear instantly on all audience screens.
5. Repeat for the next question.

## Architecture

- **Next.js App Router** with TypeScript and Tailwind CSS.
- **Server-Sent Events (SSE)** push state changes to all connected clients in real time -- no polling, no page refresh.
- **In-memory only** -- all data lives in the Node.js server process. State resets on server restart.
- **No database, no external auth** -- minimal dependencies by design.

## Important Notes

- State is stored in server memory and will be lost when the server restarts.
- Designed for single-instance internal use (one server process serving all clients).
- Admin credentials are read from environment variables and never exposed to the client.
