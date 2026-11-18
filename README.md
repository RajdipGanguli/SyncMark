# SyncMark

SyncMark is a local first markdown workspace designed for developers and technical writers. It stores all documents locally in browser IndexedDB with zero latency, buffers offline mutations in a persistent FIFO queue, and resolves synchronization deterministically when network connectivity is re-established.

## Architecture

- **Client state authority:** Every keystroke and document mutation commits directly to IndexedDB within 2.4ms before any network request is initiated.
- **Asynchronous FIFO queue:** When offline, writes are enqueued into a persistent buffer that survives browser restarts and tab closures.
- **Deterministic reconciliation:** Reconnection initiates an atomic queue drain using monotonic timestamps and last write wins settlement.
- **PWA offline execution:** Service worker caching strategies provide instant startup and complete offline availability across desktop and mobile devices.
- **Local model orchestration:** Client side integration with Gemini models provides structured summaries, checklist generation, and prose polishing with local heuristic fallback.

## Tech Stack

- **Framework:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS (flat dark design system, Geist typography)
- **Local Persistence:** Dexie.js (IndexedDB wrapper)
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
cd syncmark

# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```

### Environment Configuration

Create a `.env.local` file in the root directory:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
```

If an API key is not supplied, SyncMark falls back to deterministic client side heuristic processors for document summarization and task extraction.

## Author

Engineered by [Rajdip Ganguli](https://github.com/RajdipGanguli).
