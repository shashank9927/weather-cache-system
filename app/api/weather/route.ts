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

        // Sanitize city name - remove special characters that could cause issues
        const sanitizedCity = city.replace(/[`@#$%^&*()+=\[\]{}|\\<>]/g, '').trim();
        
        if (!sanitizedCity || sanitizedCity.length < 2) {
            return NextResponse.json(
                { success: false, error: 'Please enter a valid city name (at least 2 characters).' },
                { status: 400 }
            );
        }

        const result = await getCityWeather(
            sanitizedCity,
            lat ? parseFloat(lat) : undefined,
            lon ? parseFloat(lon) : undefined
        );

        return NextResponse.json(
            {
                success: true,
                data: result.data,
                cacheSource: result.cacheSource,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        
        // Return 404 for city not found errors
        if (errorMessage.includes('City not found')) {
            return NextResponse.json(
                {
                    success: false,
                    error: errorMessage,
                },
                { status: 404 }
            );
        }
        
        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
            },
            { status: 500 }
        );
    }
}
