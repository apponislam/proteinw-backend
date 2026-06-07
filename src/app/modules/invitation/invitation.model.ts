import mongoose, { Schema, Document } from "mongoose";
import { IInvitation } from "./invitation.interface";

export interface InvitationDocument extends Omit<IInvitation, "_id">, Document {}

const InvitationSchema = new Schema<InvitationDocument>(
    {
        groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
        inviterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        email: { type: String, required: true, trim: true, lowercase: true, unique: true },
        status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending", required: true },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// Indexes
InvitationSchema.index({ groupId: 1 });
InvitationSchema.index({ inviterId: 1 });
InvitationSchema.index({ status: 1 });

export const InvitationModel = mongoose.model<InvitationDocument>("Invitation", InvitationSchema);
