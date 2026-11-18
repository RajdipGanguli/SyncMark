# SyncMark

SyncMark is a local first markdown workspace designed for developers and technical writers. It stores documents locally in browser IndexedDB with instantaneous response, buffers mutations in a persistent FIFO queue, and provides serverless AI writing assistance.

## Architecture

- **Client state authority:** Document mutations persist directly to browser IndexedDB through Dexie.js with debounced auto-saves (~250ms) and reactive `useLiveQuery` subscriptions.
- **Persistent FIFO queue:** Mutations are captured into a dedicated IndexedDB `syncQueue` table with deduplicated keys (one queue entry per document).
- **Local first execution:** Operates fully offline without external backend dependencies. The sync engine is structured with an asynchronous FIFO queue ready for remote server connection.
- **Serverless AI proxy:** AI operations (summarize, action items extraction, prose polish, technical expansion) route through a secure Vercel serverless function (`/api/ai`) targeting `gemini-2.5-flash`. API keys are kept strictly on the server.
- **Real performance measurement:** All write metrics and throughput statistics are measured directly in-browser using `performance.now()` across actual IndexedDB transactions, rather than simulated strings.
- **Progressive web app:** Offline caching via Workbox and Vite PWA precaches application bundles and caches Google Fonts for zero-network startup.

## Tech Stack

- **Framework:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS (flat dark design system, Geist typography)
- **Local Persistence:** Dexie.js (`dexie`, `dexie-react-hooks`)
- **Markdown Rendering:** `react-markdown`, `remark-gfm`
- **Motion:** Framer Motion
- **Icons:** Phosphor Icons
- **Offline Runtime:** Vite PWA, Workbox

## Local Development

### Prerequisites

- Node.js 18+
- npm or pnpm

### Setup

```bash
# Clone the repository
git clone https://github.com/RajdipGanguli/SyncMark.git
cd SyncMark

# Install dependencies
npm install --legacy-peer-deps

# Configure environment variables (optional for AI features)
cp .env.example .env.local

# Start development server
npm run dev

# Or run with Vercel CLI to test the /api/ai serverless proxy locally
npx vercel dev

# Build production bundle
npm run build
```

### Environment Configuration

To enable AI copilot features (summaries, action item checklists, prose polishing):
1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
2. For local testing with `vercel dev`, place `GEMINI_API_KEY=your_key` in `.env.local`.
3. For production deployments on Vercel, configure `GEMINI_API_KEY` in your Vercel Project Settings > Environment Variables.

## Author

Created by [Rajdip Ganguli](https://github.com/RajdipGanguli).
