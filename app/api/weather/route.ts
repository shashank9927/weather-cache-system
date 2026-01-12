import { NextRequest, NextResponse } from 'next/server';
import { getCityWeather } from '@/lib/weatherService';


export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const city = searchParams.get('city');
        const lat = searchParams.get('lat');
        const lon = searchParams.get('lon');

        if (!city) {
            return NextResponse.json(
                { error: 'City parameter is required. Example: /api/weather?city=London' },
                { status: 400 }
            );
        }

        const weatherData = await getCityWeather(
            city,
            lat ? parseFloat(lat) : undefined,
            lon ? parseFloat(lon) : undefined
        );

        return NextResponse.json(
            {
                success: true,
                data: weatherData,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 }
        );
    }
}
