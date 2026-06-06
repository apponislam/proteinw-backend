import mongoose, { Schema, Document } from "mongoose";
import { IContactUs } from "./contact.interface";

export interface ContactDocument extends Omit<IContactUs, "_id">, Document {}

const ContactSchema = new Schema<ContactDocument>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true },
        subject: { type: String, required: true, trim: true },
        phone: { type: String, trim: true },
        message: { type: String, required: true, trim: true },
        isRead: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

ContactSchema.index({ isDeleted: 1, isRead: 1 });
ContactSchema.index({ email: 1 });
ContactSchema.index({ createdAt: -1 });

export const ContactModel = mongoose.model<ContactDocument>("Contact", ContactSchema);
