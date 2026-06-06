import mongoose, { Schema, Document } from "mongoose";
import { IGroup } from "./group.interface";

export interface GroupDocument extends Omit<IGroup, "_id">, Document {}

const GroupSchema = new Schema<GroupDocument>(
    {
        name: { type: String, required: true, trim: true },
        shortDescription: { type: String, required: true, trim: true },
        goal: { type: String, required: true, trim: true },
        endDate: { type: Date, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

GroupSchema.index({ isActive: 1, isDeleted: 1, endDate: -1 });
GroupSchema.index({ isDeleted: 1, createdAt: -1 });
GroupSchema.index({ createdBy: 1, isDeleted: 1, createdAt: -1 });

export const GroupModel = mongoose.model<GroupDocument>("Group", GroupSchema);
