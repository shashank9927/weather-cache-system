import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Weather from '@/models/Weather';


export async function GET() {
    try {
        await connectDB();
        const TTL_MS = 30 * 60 * 1000;


        const weatherDocs = await Weather.find({}).sort({ lastFetched: -1 }).limit(50);


        const formattedEntries = weatherDocs.map((doc) => ({
            city: doc.city,
            lastFetched: doc.lastFetched.toISOString(),
            status: Date.now() - doc.lastFetched.getTime() < TTL_MS ? 'fresh' : 'expired',
            age: Math.round((Date.now() - doc.lastFetched.getTime()) / 1000),
            coordinates: doc.data.coordinates,
        }));

        return NextResponse.json(
            {
                success: true,
                database: {
                    totalRecords: weatherDocs.length,
                    entries: formattedEntries,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Database API Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 }
        );
    }
}
