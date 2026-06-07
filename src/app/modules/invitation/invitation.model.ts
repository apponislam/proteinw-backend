import mongoose, { Schema, Document } from "mongoose";
import { IInvitation } from "./invitation.interface";

export interface InvitationDocument extends Omit<IInvitation, "_id">, Document {}

const InvitationSchema = new Schema<InvitationDocument>(
    {
        groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
        inviterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        code: { type: String, required: true, unique: true, trim: true },
        status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending", required: true },
        expiresAt: { type: Date, required: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// Pre-save hook to generate invitation code and expiresAt
InvitationSchema.pre("save", function () {
    if (this.isNew) {
        // Generate unique 8-character code
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        for (let i = 0; i < 8; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        this.code = code;

        // Set expiresAt to 7 days from now
        this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
});

// Indexes
InvitationSchema.index({ groupId: 1, isDeleted: 1 });
InvitationSchema.index({ email: 1, isDeleted: 1 });
InvitationSchema.index({ code: 1, isDeleted: 1 });
InvitationSchema.index({ inviterId: 1, isDeleted: 1 });
InvitationSchema.index({ expiresAt: 1, status: 1 });

export const InvitationModel = mongoose.model<InvitationDocument>("Invitation", InvitationSchema);
