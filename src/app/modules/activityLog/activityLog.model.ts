import mongoose, { Schema, Document } from "mongoose";
import { IActivityLog } from "./activityLog.interface";

export interface ActivityLogDocument extends Omit<IActivityLog, "_id">, Document {}

const ActivityLogSchema = new Schema<ActivityLogDocument>(
    {
        groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
        type: { type: String, enum: ["SALE", "MILESTONE", "MEMBER", "CAMPAIGN"], required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export const ActivityLogModel = mongoose.model<ActivityLogDocument>("ActivityLog", ActivityLogSchema);
