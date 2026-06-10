import mongoose, { Schema, Document } from "mongoose";
import { IProduct } from "./product.interface";

export interface ProductDocument extends Omit<IProduct, "_id">, Document {}

const ProductSchema = new Schema<ProductDocument>(
    {
        name: { type: String, required: true, trim: true },
        price: { type: Number, required: true },
        shortDescription: { type: String, required: true, trim: true },
        category: { type: String, required: true, trim: true },
        subCategory: { type: String, trim: true },
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

// Index for public product queries (active, not deleted, by category/subcategory, sorted by recent)
ProductSchema.index({ isActive: 1, isDeleted: 1, category: 1, subCategory: 1, createdAt: -1 });

// Index for admin product list (all products, sorted by recent)
ProductSchema.index({ isDeleted: 1, createdAt: -1 });

// Index for products by creator
ProductSchema.index({ createdBy: 1, isDeleted: 1, createdAt: -1 });

// Text index for name/description search
ProductSchema.index({ name: "text", shortDescription: "text" });

// Index for price range queries
ProductSchema.index({ price: 1, isActive: 1, isDeleted: 1 });

export const ProductModel = mongoose.model<ProductDocument>("Product", ProductSchema);
