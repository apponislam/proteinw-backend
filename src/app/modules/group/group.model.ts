import mongoose, { Schema, Document } from "mongoose";
import { IGroup } from "./group.interface";

export interface GroupDocument extends Omit<IGroup, "_id">, Document {}

const GroupSchema = new Schema<GroupDocument>(
    {
        name: { type: String, required: true, trim: true },
        shortDescription: { type: String, required: true, trim: true },
        goal: { type: String, required: true, trim: true },
        endDate: { type: Date, required: true },
        code: { type: String, unique: true, trim: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// Pre-save hook to generate group code
GroupSchema.pre("save", function () {
    if (this.isNew && !this.code) {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        for (let i = 0; i < 8; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        this.code = code;
    }
});

GroupSchema.index({ isActive: 1, isDeleted: 1, endDate: -1 });
GroupSchema.index({ isDeleted: 1, createdAt: -1 });
GroupSchema.index({ createdBy: 1, isDeleted: 1, createdAt: -1 });
GroupSchema.index({ code: 1, isDeleted: 1 });

export const GroupModel = mongoose.model<GroupDocument>("Group", GroupSchema);
