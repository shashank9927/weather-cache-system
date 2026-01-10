import connectDB from './db';
import Weather from '@/models/Weather';
import { lruCache } from './lruCache';
import { fetchWeatherApi } from 'openmeteo';

const TTL_MS = 30 * 60 * 1000;

function isFresh(lastFetched: number): boolean {
    return Date.now() - lastFetched < TTL_MS;
}

async function getCoordinates(city: string): Promise<{ lat: number; lon: number }> {
    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            city
        )}&count=1&language=en&format=json`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            console.log(`Geocoded ${city}: ${result.latitude}, ${result.longitude}`);
            return { lat: result.latitude, lon: result.longitude };
        } else {
            console.warn(`Geocoding failed for ${city}, using default coordinates (London)`);
            return { lat: 51.5074, lon: -0.1278 };
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        return { lat: 51.5074, lon: -0.1278 };
    }
}

async function fetchFromSource(city: string, lat?: number, lon?: number): Promise<any> {
    console.log(`Fetching from OpenMeteo API: ${city}`);

    let coords = { lat: lat || 0, lon: lon || 0 };

    if (!lat || !lon) {
        coords = await getCoordinates(city);
    }

    try {
        const params = {
            latitude: coords.lat,
            longitude: coords.lon,
            current: [
                'temperature_2m',
                'relative_humidity_2m',
                'apparent_temperature',
                'surface_pressure',
                'weather_code',
                'wind_speed_10m',
            ],
            hourly: ['temperature_2m', 'precipitation_probability'],
            daily: ['temperature_2m_max', 'temperature_2m_min'],
            timezone: 'auto',
        };

        const responses = await fetchWeatherApi('https://api.open-meteo.com/v1/forecast', params);
        const response = responses[0];

        const current = response.current()!;
        const hourly = response.hourly()!;
        const daily = response.daily()!;

        const weatherData = {
            city,
            coordinates: coords,
            current: {
                time: new Date(Number(current.time()) * 1000).toISOString(),
                temperature: current.variables(0)!.value(),
                humidity: current.variables(1)!.value(),
                apparentTemperature: current.variables(2)!.value(),
                pressure: current.variables(3)!.value(),
                weatherCode: current.variables(4)!.value(),
                windSpeed: current.variables(5)!.value(),
            },
            hourly: {
                time: Array.from(
                    { length: Math.min(24, hourly.variables(0)!.valuesArray()!.length) },
                    (_, i) => new Date(Number(hourly.time()) * 1000 + i * 3600000).toISOString()
                ),
                temperature: Array.from(hourly.variables(0)!.valuesArray()!.slice(0, 24)),
                precipitationProbability: Array.from(
                    hourly.variables(1)!.valuesArray()!.slice(0, 24)
                ),
            },
            daily: {
                time: Array.from(
                    { length: daily.variables(0)!.valuesArray()!.length },
                    (_, i) => new Date(Number(daily.time()) * 1000 + i * 86400000).toISOString()
                ),
                temperatureMax: Array.from(daily.variables(0)!.valuesArray()!),
                temperatureMin: Array.from(daily.variables(1)!.valuesArray()!),
            },
            fetchedAt: new Date().toISOString(),
        };

        return weatherData;
    } catch (error) {
        console.error('Error fetching from OpenMeteo:', error);
        throw new Error('Failed to fetch weather data from API');
    }
}

export async function getCityWeather(city: string, lat?: number, lon?: number): Promise<any> {
    const normalizedCity = city.toLowerCase().trim();
    const now = Date.now();

    const l1Result = lruCache.get(normalizedCity);

    if (l1Result) {
        if (isFresh(l1Result.lastFetched)) {
            console.log(`L1 Cache Hit (Fresh): ${normalizedCity}`);
            return l1Result.value;
        } else {
            console.log(`L1 Cache Hit (Expired): ${normalizedCity}`);
        }
    } else {
        console.log(`L1 Cache Miss: ${normalizedCity}`);
    }

    await connectDB();
    const weatherDoc = await Weather.findOne({ city: normalizedCity });

    if (weatherDoc) {
        const l2LastFetched = weatherDoc.lastFetched.getTime();

        if (isFresh(l2LastFetched)) {
            console.log(`L2 Cache Hit (Fresh): ${normalizedCity}`);
            lruCache.set(normalizedCity, weatherDoc.data, l2LastFetched);
            return weatherDoc.data;
        } else {
            console.log(`L2 Cache Hit (Expired): ${normalizedCity}`);
        }
    } else {
        console.log(`L2 Cache Miss: ${normalizedCity}`);
    }

    const freshData = await fetchFromSource(normalizedCity, lat, lon);

    await Weather.findOneAndUpdate(
        { city: normalizedCity },
        {
            city: normalizedCity,
            data: freshData,
            lastFetched: new Date(),
        },
        { upsert: true, new: true }
    );
    console.log(`Updated L2 Cache (MongoDB): ${normalizedCity}`);

    lruCache.set(normalizedCity, freshData, now);
    console.log(`Updated L1 Cache (LRU): ${normalizedCity}`);

    return freshData;
}
