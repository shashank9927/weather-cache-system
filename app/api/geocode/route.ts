import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('query');

        if (!query || query.trim().length < 2) {
            return NextResponse.json(
                { success: true, suggestions: [] },
                { status: 200 }
            );
        }

  
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            query
        )}&count=5&language=en&format=json`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return NextResponse.json(
                { success: true, suggestions: [] },
                { status: 200 }
            );
        }


        const suggestions = data.results.map((result: any) => ({
            name: result.name,
            fullName: `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}`,
            lat: result.latitude,
            lon: result.longitude,
            country: result.country,
            admin1: result.admin1,
        }));

        return NextResponse.json(
            {
                success: true,
                suggestions,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Geocode API Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 }
        );
    }
}
