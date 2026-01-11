import { NextResponse } from 'next/server';
import { lruCache } from '@/lib/lruCache';

export async function GET() {
    return NextResponse.json({
        success: true,
        capacity: lruCache.getCapacity(),
        size: lruCache.size()
    });
}

export async function POST(request: Request) {
    try {
        const { capacity } = await request.json();

        if (!capacity || typeof capacity !== 'number' || capacity < 1 || capacity > 1000) {
            return NextResponse.json(
                { success: false, error: 'Capacity must be a number between 1 and 1000' },
                { status: 400 }
            );
        }

        lruCache.resize(capacity);

        return NextResponse.json({
            success: true,
            message: `Cache capacity set to ${capacity}`,
            capacity: lruCache.getCapacity(),
            size: lruCache.size()
        });
    } catch (error) {
        console.error('Error resizing cache:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to resize cache' },
            { status: 500 }
        );
    }
}
