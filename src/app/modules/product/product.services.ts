import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { ProductModel } from "./product.model";

const createProduct = async (userId: string, payload: any, productImage?: string) => {
    const product = await ProductModel.create({
        ...payload,
        productImage,
        createdBy: new Types.ObjectId(userId),
    });
    return product;
};

const getAllProducts = async (query: any = {}) => {
    const filter: any = { isDeleted: false };
    if (query.category) filter.category = query.category;
    if (query.isActive !== undefined) filter.isActive = query.isActive === "true";

    const products = await ProductModel.find(filter).sort({ createdAt: -1 });
    return products;
};

const getActiveProducts = async (category?: string) => {
    const filter: any = { isActive: true, isDeleted: false };
    if (category) {
        filter.category = category;
    }
    const products = await ProductModel.find(filter).sort({ createdAt: -1 });
    return products;
};

const getProductById = async (productId: string) => {
    const product = await ProductModel.findOne({ _id: productId, isDeleted: false });
    if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
    return product;
};

const updateProduct = async (productId: string, payload: any, productImage?: string) => {
    const updateData: any = { ...payload };
    if (productImage) {
        updateData.productImage = productImage;
    }
    
    const product = await ProductModel.findOneAndUpdate(
        { _id: productId, isDeleted: false },
        { $set: updateData },
        { returnDocument: "after", runValidators: true },
    );
    if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
    return product;
};

const toggleProductStatus = async (productId: string) => {
    const product = await ProductModel.findOne({ _id: productId, isDeleted: false });
    if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
    product.isActive = !product.isActive;
    await product.save();
    return product;
};

const deleteProduct = async (productId: string) => {
    const product = await ProductModel.findOneAndUpdate(
        { _id: productId, isDeleted: false },
        { $set: { isDeleted: true, isActive: false } },
        { returnDocument: "after" },
    );
    if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
    return product;
};

export const productServices = {
    createProduct,
    getAllProducts,
    getActiveProducts,
    getProductById,
    updateProduct,
    toggleProductStatus,
    deleteProduct,
};
