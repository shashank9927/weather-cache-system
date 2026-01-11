import { NextResponse } from 'next/server';
import { lruCache } from '@/lib/lruCache';

export async function DELETE() {
    try {
        lruCache.clear();
        console.log('L1 Cache cleared');

        return NextResponse.json({
            success: true,
            message: 'L1 cache cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing L1 cache:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to clear cache' },
            { status: 500 }
        );
    }
}
