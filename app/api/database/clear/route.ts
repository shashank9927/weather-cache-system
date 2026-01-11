import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Weather from '@/models/Weather';

export async function DELETE() {
    try {
        await connectDB();

        const result = await Weather.deleteMany({});

        console.log(`L2 Database cleared (${result.deletedCount} entries)`);

        return NextResponse.json({
            success: true,
            message: `Database cleared successfully (${result.deletedCount} entries deleted)`
        });
    } catch (error) {
        console.error('Error clearing L2 database:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to clear database' },
            { status: 500 }
        );
    }
}
