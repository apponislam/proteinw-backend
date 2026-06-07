import mongoose, { Schema, Document } from "mongoose";
import { ICampaignProduct } from "./campaignProduct.interface";

export interface CampaignProductDocument extends Omit<ICampaignProduct, "_id">, Document {}

const CampaignProductSchema = new Schema<CampaignProductDocument>(
    {
        campaignId: {
            type: Schema.Types.ObjectId,
            ref: "Campaign",
            required: true,
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// Compound unique index to prevent duplicate product in same campaign
CampaignProductSchema.index({ campaignId: 1, productId: 1 }, { unique: true });

// Indexes for fast queries
CampaignProductSchema.index({ campaignId: 1, isDeleted: 1 });
CampaignProductSchema.index({ productId: 1, isDeleted: 1 });

export const CampaignProductModel = mongoose.model<CampaignProductDocument>("CampaignProduct", CampaignProductSchema);
