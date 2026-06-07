import mongoose, { Schema, Document } from "mongoose";
import { ITier } from "./tier.interface";

export interface TierDocument extends Omit<ITier, "_id">, Document {}

const TierSchema = new Schema<TierDocument>(
    {
        name: { type: String, required: true, trim: true },
        percentage: { type: Number, required: true, min: 0, max: 100 },
        minSalesVolume: { type: Number, required: true, min: 0 },
        maxSalesVolume: { type: Number, min: 0 },
        isPopular: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

TierSchema.index({ isActive: 1, minSalesVolume: 1 });

export const TierModel = mongoose.model<TierDocument>("Tier", TierSchema);
