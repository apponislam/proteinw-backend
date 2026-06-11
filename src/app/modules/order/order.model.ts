import mongoose, { Schema, Document } from "mongoose";
import { IOrder, IOrderItem } from "./order.interface";

export interface OrderDocument extends Omit<IOrder, "_id">, Document {}

// Schema for order items
const OrderItemSchema = new Schema<IOrderItem>({
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    singlePrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
});

const OrderSchema = new Schema<OrderDocument>(
    {
        customerName: { type: String, required: true, trim: true },
        customerEmail: { type: String, required: true, trim: true, lowercase: true },
        customerPhone: { type: String, trim: true },
        address: {
            street: { type: String, required: true, trim: true },
            city: { type: String, required: true, trim: true },
            postalCode: { type: String, required: true, trim: true },
            country: { type: String, required: true, trim: true },
        },
        items: [OrderItemSchema],
        totalPackage: { type: Number, required: true, min: 0 },
        totalPrice: { type: Number, required: true, min: 0 },
        memberId: { type: Schema.Types.ObjectId, ref: "User" },
        campaignId: { type: Schema.Types.ObjectId, ref: "Campaign" },
        groupId: { type: Schema.Types.ObjectId, ref: "Group" },
        status: {
            type: String,
            enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
            default: "pending",
        },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// Indexes
OrderSchema.index({ memberId: 1, isDeleted: 1, createdAt: -1 });
OrderSchema.index({ campaignId: 1, isDeleted: 1, createdAt: -1 });
OrderSchema.index({ groupId: 1, isDeleted: 1, createdAt: -1 });
OrderSchema.index({ customerEmail: 1, isDeleted: 1 });
OrderSchema.index({ isDeleted: 1, createdAt: -1, totalPackage: 1 });

export const OrderModel = mongoose.model<OrderDocument>("Order", OrderSchema);
