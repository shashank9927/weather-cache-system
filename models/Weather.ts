import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWeather extends Document {
    city: string;
    data: any;
    lastFetched: Date;
}

const WeatherSchema: Schema = new Schema(
    {
        city: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
            lowercase: true,
        },
        data: {
            type: Schema.Types.Mixed,
            required: true,
        },
        lastFetched: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const Weather: Model<IWeather> =
    mongoose.models.Weather || mongoose.model<IWeather>('Weather', WeatherSchema);

export default Weather;
