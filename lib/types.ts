// Shared TypeScript interfaces for the Weather Cache System

export interface WeatherCoordinates {
    lat: number;
    lon: number;
}

export interface CurrentWeather {
    time: string;
    temperature: number;
    humidity: number;
    apparentTemperature: number;
    pressure: number;
    weatherCode: number;
    windSpeed: number;
}

export interface HourlyWeather {
    time: string[];
    temperature: number[];
    precipitationProbability: number[];
}

export interface DailyWeather {
    time: string[];
    temperatureMax: number[];
    temperatureMin: number[];
}

export interface WeatherData {
    city: string;
    coordinates: WeatherCoordinates;
    current: CurrentWeather;
    hourly: HourlyWeather;
    daily: DailyWeather;
    fetchedAt: string;
}

export interface GeocodingResult {
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
}
