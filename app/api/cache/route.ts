import { NextResponse } from 'next/server';
import { lruCache } from '@/lib/lruCache';

export async function GET() {
    try {
        const entries = lruCache.getAllEntries();
        const TTL_MS = 30 * 60 * 1000;


        const formattedEntries = entries.map((entry) => ({
            city: entry.key,
            lastFetched: new Date(entry.lastFetched).toISOString(),
            status: Date.now() - entry.lastFetched < TTL_MS ? 'fresh' : 'expired',
            age: Math.round((Date.now() - entry.lastFetched) / 1000), // seconds
        }));

        return NextResponse.json(
            {
                success: true,
                cache: {
                    size: lruCache.size(),
                    capacity: 100,
                    entries: formattedEntries,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Cache API Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 }
        );
    }
}
