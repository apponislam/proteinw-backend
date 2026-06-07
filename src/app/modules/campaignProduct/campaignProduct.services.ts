import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { CampaignProductModel } from "./campaignProduct.model";
import { CampaignModel } from "../campaign/campaign.model";
import { ProductModel } from "../product/product.model";

// Add a product to a campaign
const addProductToCampaign = async (campaignId: string, productId: string) => {
    // Check if campaign exists
    const campaign = await CampaignModel.findOne({ _id: campaignId, isDeleted: false });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Campaign not found");

    // Check if product exists
    const product = await ProductModel.findOne({ _id: productId, isDeleted: false });
    if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Product not found");

    // Check if product is already in campaign
    const existing = await CampaignProductModel.findOne({
        campaignId: new Types.ObjectId(campaignId),
        productId: new Types.ObjectId(productId),
        isDeleted: false,
    });
    if (existing) throw new ApiError(httpStatus.BAD_REQUEST, "Product already added to campaign");

    // Create the association
    const campaignProduct = await CampaignProductModel.create({
        campaignId: new Types.ObjectId(campaignId),
        productId: new Types.ObjectId(productId),
    });

    return campaignProduct;
};

// Add multiple products to a campaign
const addMultipleProductsToCampaign = async (campaignId: string, productIds: string[]) => {
    // Check if campaign exists
    const campaign = await CampaignModel.findOne({ _id: campaignId, isDeleted: false });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Campaign not found");

    // Check if products exist
    const products = await ProductModel.find({ _id: { $in: productIds.map(id => new Types.ObjectId(id)) }, isDeleted: false });
    if (products.length !== productIds.length) {
        throw new ApiError(httpStatus.NOT_FOUND, "One or more products not found");
    }

    // Prepare operations for bulk write
    const operations = productIds.map(productId => ({
        updateOne: {
            filter: {
                campaignId: new Types.ObjectId(campaignId),
                productId: new Types.ObjectId(productId),
            },
            update: { $setOnInsert: { isDeleted: false } },
            upsert: true,
        },
    }));

    // Perform bulk write
    await CampaignProductModel.bulkWrite(operations);

    // Return the added products
    return CampaignProductModel.find({
        campaignId: new Types.ObjectId(campaignId),
        productId: { $in: productIds.map(id => new Types.ObjectId(id)) },
        isDeleted: false,
    }).populate("productId");
};

// Remove a product from a campaign
const removeProductFromCampaign = async (campaignId: string, productId: string) => {
    const campaignProduct = await CampaignProductModel.findOneAndUpdate(
        {
            campaignId: new Types.ObjectId(campaignId),
            productId: new Types.ObjectId(productId),
            isDeleted: false,
        },
        { $set: { isDeleted: true } },
        { returnDocument: "after" }
    );

    if (!campaignProduct) throw new ApiError(httpStatus.NOT_FOUND, "Product not found in campaign");
    return campaignProduct;
};

// Remove multiple products from a campaign
const removeMultipleProductsFromCampaign = async (campaignId: string, productIds: string[]) => {
    const result = await CampaignProductModel.updateMany(
        {
            campaignId: new Types.ObjectId(campaignId),
            productId: { $in: productIds.map(id => new Types.ObjectId(id)) },
            isDeleted: false,
        },
        { $set: { isDeleted: true } }
    );
    return result;
};

// Get all products in a campaign with pagination
const getProductsByCampaign = async (campaignId: string, query: any = {}) => {
    const filter: any = { campaignId: new Types.ObjectId(campaignId), isDeleted: false };

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const campaignProducts = await CampaignProductModel.find(filter)
        .populate("productId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await CampaignProductModel.countDocuments(filter);

    return {
        data: campaignProducts.map(cp => cp.productId), // Return just the product data
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        },
    };
};

// Get all campaigns that include a specific product
const getCampaignsByProduct = async (productId: string) => {
    const campaignProducts = await CampaignProductModel.find({
        productId: new Types.ObjectId(productId),
        isDeleted: false,
    }).populate("campaignId");

    return campaignProducts.map(cp => cp.campaignId);
};

export const campaignProductServices = {
    addProductToCampaign,
    addMultipleProductsToCampaign,
    removeProductFromCampaign,
    removeMultipleProductsFromCampaign,
    getProductsByCampaign,
    getCampaignsByProduct,
};
