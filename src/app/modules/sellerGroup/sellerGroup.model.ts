import mongoose, { Schema, Document } from "mongoose";
import { ISellerGroup } from "./sellerGroup.interface";

export interface SellerGroupDocument extends ISellerGroup, Document {}

const SellerGroupSchema = new Schema<SellerGroupDocument>(
    {
        sellerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        groupId: {
            type: Schema.Types.ObjectId,
            ref: "Group",
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

// Prevent duplicate join for the same seller and group
SellerGroupSchema.index({ sellerId: 1, groupId: 1 }, { unique: true });
SellerGroupSchema.index({ sellerId: 1, isDeleted: 1 });
SellerGroupSchema.index({ groupId: 1, isDeleted: 1 });

export const SellerGroupModel = mongoose.model<SellerGroupDocument>("SellerGroup", SellerGroupSchema);
