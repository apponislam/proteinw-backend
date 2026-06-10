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
    if (query.subCategory) filter.subCategory = query.subCategory;
    if (query.isActive !== undefined) filter.isActive = query.isActive === "true";

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await ProductModel.countDocuments(filter);
    const products = await ProductModel.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: "campaignproducts",
                let: { productId: "$_id" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$productId", "$$productId"] }, isDeleted: false } },
                    { $sort: { createdAt: 1 } },
                    { $limit: 10 },
                    {
                        $lookup: {
                            from: "campaigns",
                            localField: "campaignId",
                            foreignField: "_id",
                            as: "campaign",
                        },
                    },
                    { $unwind: "$campaign" },
                    { $match: { "campaign.isDeleted": false, "campaign.isActive": true } },
                    { $project: { _id: 0, name: "$campaign.name" } },
                ],
                as: "campaigns",
            },
        },
        { $addFields: { campaigns: "$campaigns.name" } },
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
        data: products,
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasNext,
            hasPrev,
        },
    };
};

const getActiveProducts = async (query: any = {}) => {
    const filter: any = { isActive: true, isDeleted: false };
    if (query.category) filter.category = query.category;
    if (query.subCategory) filter.subCategory = query.subCategory;

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await ProductModel.countDocuments(filter);
    const products = await ProductModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
        data: products,
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasNext,
            hasPrev,
        },
    };
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

    const product = await ProductModel.findOneAndUpdate({ _id: productId, isDeleted: false }, { $set: updateData }, { returnDocument: "after", runValidators: true });
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
    const product = await ProductModel.findOneAndUpdate({ _id: productId, isDeleted: false }, { $set: { isDeleted: true, isActive: false } }, { returnDocument: "after" });
    if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
    return product;
};

const getProductStats = async () => {
    const total = await ProductModel.countDocuments({ isDeleted: false });
    const active = await ProductModel.countDocuments({ isDeleted: false, isActive: true });
    return { total, active };
};

export const productServices = {
    createProduct,
    getAllProducts,
    getActiveProducts,
    getProductById,
    updateProduct,
    toggleProductStatus,
    deleteProduct,
    getProductStats,
};
