import mongoose, { Schema, Document } from "mongoose";
import { ICampaignSeller } from "./campaignSeller.interface";

export interface CampaignSellerDocument extends ICampaignSeller, Document {}

const CampaignSellerSchema = new Schema<CampaignSellerDocument>(
    {
        sellerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        campaignId: {
            type: Schema.Types.ObjectId,
            ref: "Campaign",
            required: true,
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// Prevent duplicate join for the same seller and campaign
CampaignSellerSchema.index({ sellerId: 1, campaignId: 1 }, { unique: true });
CampaignSellerSchema.index({ sellerId: 1, isDeleted: 1 });
CampaignSellerSchema.index({ campaignId: 1, isDeleted: 1 });

export const CampaignSellerModel = mongoose.model<CampaignSellerDocument>("CampaignSeller", CampaignSellerSchema);
