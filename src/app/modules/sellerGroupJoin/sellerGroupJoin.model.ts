import mongoose, { Schema, Document } from "mongoose";
import { ISellerGroupJoin } from "./sellerGroupJoin.interface";

export interface SellerGroupJoinDocument extends ISellerGroupJoin, Document {}

const SellerGroupJoinSchema = new Schema<SellerGroupJoinDocument>(
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
SellerGroupJoinSchema.index({ sellerId: 1, groupId: 1 }, { unique: true });
SellerGroupJoinSchema.index({ sellerId: 1, isDeleted: 1 });
SellerGroupJoinSchema.index({ groupId: 1, isDeleted: 1 });

export const SellerGroupJoinModel = mongoose.model<SellerGroupJoinDocument>("SellerGroupJoin", SellerGroupJoinSchema);
