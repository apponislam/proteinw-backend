import mongoose, { Schema, Document } from "mongoose";
import { ICampaign } from "./campaign.interface";

export interface CampaignDocument extends Omit<ICampaign, "_id">, Document {}

const CampaignSchema = new Schema<CampaignDocument>(
    {
        name: { type: String, required: true, trim: true },
        shortDescription: { type: String, required: true, trim: true },
        target: { type: Number, required: true },
        endDate: { type: Date, required: true },
        code: { type: String, unique: true, trim: true },
        groupId: { type: Schema.Types.ObjectId, ref: "Group" },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        tierId: { type: Schema.Types.ObjectId, ref: "Tier" },
        tierAssignDate: { type: Date },
        status: {
            type: String,
            enum: ["DRAFT", "ACTIVE", "FULFILMENT", "COMPLETED"],
            default: "ACTIVE",
        },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// Pre-save hook to generate campaign code
CampaignSchema.pre("save", function () {
    if (this.isNew && !this.code) {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        for (let i = 0; i < 8; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        this.code = code;
    }
});

CampaignSchema.index({ status: 1, isDeleted: 1, endDate: -1 });
CampaignSchema.index({ isDeleted: 1, createdAt: -1 });
CampaignSchema.index({ createdBy: 1, isDeleted: 1, createdAt: -1 });
CampaignSchema.index({ groupId: 1, isDeleted: 1, status: 1 });
CampaignSchema.index({ code: 1, isDeleted: 1 });
CampaignSchema.index({ tierId: 1, isDeleted: 1 });
CampaignSchema.index({ tierAssignDate: -1 });

export const CampaignModel = mongoose.model<CampaignDocument>("Campaign", CampaignSchema);
