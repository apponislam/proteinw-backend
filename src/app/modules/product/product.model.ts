import mongoose, { Schema, Document } from "mongoose";
import { IProduct } from "./product.interface";

export interface ProductDocument extends Omit<IProduct, "_id">, Document {}

const ProductSchema = new Schema<ProductDocument>(
    {
        name: { type: String, required: true, trim: true },
        price: { type: Number, required: true },
        className: { type: String, required: true, trim: true },
        shortDescription: { type: String, required: true, trim: true },
        category: { type: String, required: true, trim: true },
        productImage: { type: String },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

ProductSchema.index({ isActive: 1, category: 1 });

export const ProductModel = mongoose.model<ProductDocument>("Product", ProductSchema);
