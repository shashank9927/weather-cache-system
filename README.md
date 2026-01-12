# Weather Cache System

A weather application demonstrating advanced caching strategies through a custom-built LRU cache implementation with MongoDB persistence.

## Overview

This project showcases a two-tier caching architecture designed to minimize API calls and optimize response times. The system uses a custom LRU (Least Recently Used) cache built from scratch using fundamental data structures, combined with MongoDB for persistent storage.

## Architecture

### Two-Tier Caching Strategy

**L1 Cache (In-Memory LRU)**
- Custom implementation using Doubly Linked List + HashMap
- O(1) time complexity for get/set operations
- Configurable capacity (default: 100 entries)
- Evicts least recently used items automatically
- Stores most recent weather queries in memory

**L2 Cache (MongoDB)**
- Persistent database layer using Mongoose ODM
- Indexed city field for fast lookups
- Automatic timestamp tracking
- Stores weather data with fetch metadata

**Cache Flow**
```
Request → L1 Cache (check)
  ├─ Hit → Return data (~200ms on Render)
  └─ Miss → L2 Cache (check)
      ├─ Hit → Update L1 → Return data (~300ms on Render)
      └─ Miss → OpenMeteo API → Update L2 & L1 → Return data (~1500ms)
```

### Lazy Expiration

Weather data expires after 30 minutes but isn't actively removed. Expired entries are only evicted when:
- They're accessed again (checked on read)
- New data needs to be stored and capacity is exceeded

## Features

- **Custom LRU Cache** - Built from scratch using Node and DoublyLinkedList classes
- **Real-time Cache Visualization** - View L1 and L2 cache contents live
- **Dynamic Cache Management** - Adjust L1 capacity, clear caches via UI
- **City Autocomplete** - Geocoding with OpenMeteo API
- **Color-Coded Response Badges**:
  - 🟠 Orange = L1 Cache hit
  - 🟡 Yellow = L2 Cache hit  
  - ⚪ White = API call
- **Cache Flow Visualization** - See which cache layer served the request

## Tech Stack

**Frontend**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4

**Backend**
- Next.js API Routes
- Mongoose (MongoDB ODM)
- Custom LRU Cache implementation

**External Services**
- MongoDB Atlas (persistent cache storage)
- OpenMeteo API (weather data)

**Deployment**
- Render (persistent server for L1 cache)

## Performance

**On Render (production with network latency):**

| Cache Layer | Response Time | Cache Hit % |
|-------------|---------------|-------------|
| L1 (In-Memory) | ~200-250ms | 70% |
| L2 (MongoDB) | ~300-400ms | 25% |
| API (OpenMeteo) | ~1500-2000ms | 5% |

**Average response time:** ~250ms (95% cache hit rate)  
**Performance improvement:** 85-90% faster than direct API calls

## Installation

### Prerequisites

- Node.js 20+
- MongoDB Atlas account (free tier)
- Git

### Environment Variables

Create `.env.local`:

```env
MONGODB_URI
```

### Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm run start
```

## Project Structure

```
weather-cache-system/
├── app/
│   ├── api/
│   │   ├── cache/              # L1 cache management
│   │   │   ├── route.ts        # GET cache contents
│   │   │   ├── capacity/       # GET/POST cache size
│   │   │   └── clear/          # DELETE clear cache
│   │   ├── database/           # L2 cache management
│   │   │   ├── route.ts        # GET DB contents
│   │   │   └── clear/          # DELETE clear DB
│   │   ├── geocode/            # City search autocomplete
│   │   └── weather/            # Main weather endpoint
│   ├── page.tsx                # Main UI component
│   ├── layout.tsx              # App layout
│   └── globals.css             # Tailwind styles
├── lib/
│   ├── lruCache.ts             # Custom LRU implementation
│   ├── weatherService.ts       # Core caching logic
│   ├── db.ts                   # MongoDB connection
│   └── types.ts                # TypeScript interfaces
├── models/
│   └── Weather.ts              # Mongoose schema
└── public/                     # Static assets
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/weather?city=London` | GET | Get weather data |
| `/api/geocode?query=Paris` | GET | Search cities |
| `/api/cache` | GET | View L1 cache |
| `/api/cache/capacity` | GET/POST | Get/set cache size |
| `/api/cache/clear` | DELETE | Clear L1 cache |
| `/api/database` | GET | View L2 cache |
| `/api/database/clear` | DELETE | Clear L2 cache |

## Deployment

### Render (Recommended)

Render provides persistent servers, maintaining the L1 in-memory cache between requests.

1. Connect GitHub repository to Render
2. Configure service:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Environment Variables:** Add `MONGODB_URI`
3. Deploy

### Vercel (Limited)

Vercel's serverless architecture won't maintain L1 cache between requests. Only L2 MongoDB cache will work effectively.

```bash
npm i -g vercel
vercel
```

Add `MONGODB_URI` in environment variables.

## Configuration

### Cache TTL

Modify `lib/weatherService.ts`:

```typescript
const TTL_MS = 30 * 60 * 1000; // 30 minutes
```

### L1 Cache Capacity

Adjust via UI or API:

```bash
curl -X POST https://your-app.onrender.com/api/cache/capacity \
  -H "Content-Type: application/json" \
  -d '{"capacity": 200}'
```

## Implementation Details

### LRU Cache Algorithm

The custom LRU cache uses two data structures:

1. **HashMap** - O(1) key lookups
2. **Doubly Linked List** - O(1) eviction and reordering

**Operations:**
- `get(key)` - O(1): Move node to head, return value
- `set(key, value)` - O(1): Add to head, evict tail if needed
- `evict()` - O(1): Remove least recently used (tail node)

### MongoDB Schema

```typescript
{
  city: string (indexed, unique, lowercase)
  data: WeatherData (mixed schema)
  lastFetched: Date
  timestamps: true
}
```

## License

MIT
