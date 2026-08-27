import mongoose, { Schema, Document } from "mongoose";
import { ICustomerServiceRequest } from "./customerService.interface";

export interface CustomerServiceDocument extends Omit<ICustomerServiceRequest, "_id">, Document {}

const CustomerServiceSchema = new Schema<CustomerServiceDocument>(
    {
        issueType: {
            type: String,
            enum: ["reklamation", "byte"],
            required: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            required: false,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        images: {
            type: [String],
            default: [],
        },
        status: {
            type: String,
            enum: ["pending", "in_progress", "resolved", "rejected"],
            default: "pending",
        },
        adminNotes: {
            type: String,
            trim: true,
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

CustomerServiceSchema.index({ isDeleted: 1, status: 1 });
CustomerServiceSchema.index({ email: 1 });
CustomerServiceSchema.index({ orderId: 1 });
CustomerServiceSchema.index({ createdAt: -1 });

export const CustomerServiceModel = mongoose.model<CustomerServiceDocument>(
    "CustomerService",
    CustomerServiceSchema,
);
