import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { CampaignProductModel } from "./campaignProduct.model";
import { CampaignModel } from "../campaign/campaign.model";
import { ProductModel } from "../product/product.model";
import { CampaignSellerModel } from "../campaignSeller/campaignSeller.model";
import { SellerGroupModel } from "../sellerGroup/sellerGroup.model";

// Add a product to a campaign
const addProductToCampaign = async (campaignId: string, productId: string) => {
    // Check if campaign exists
    const campaign = await CampaignModel.findOne({ _id: campaignId, isDeleted: false });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Target campaign was not found or has been deleted.");

    // Check if product exists
    const product = await ProductModel.findOne({ _id: productId, isDeleted: false });
    if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Target product was not found or has been deleted.");

    // Check if campaign product record already exists
    const existing = await CampaignProductModel.findOne({
        campaignId: new Types.ObjectId(campaignId),
        productId: new Types.ObjectId(productId),
    });

    if (existing) {
        if (!existing.isDeleted) {
            throw new ApiError(httpStatus.BAD_REQUEST, "This product has already been added to the campaign.");
        }
        // If previously removed (isDeleted: true), restore it
        existing.isDeleted = false;
        await existing.save();
        return existing;
    }

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
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Target campaign was not found or has been deleted.");

    // Check if products exist
    const products = await ProductModel.find({ _id: { $in: productIds.map((id) => new Types.ObjectId(id)) }, isDeleted: false });
    if (products.length !== productIds.length) {
        throw new ApiError(httpStatus.NOT_FOUND, "One or more requested products were not found or have been deleted.");
    }

    // Prepare operations for bulk write (using $set so previously deleted records are restored)
    const operations = productIds.map((productId) => ({
        updateOne: {
            filter: {
                campaignId: new Types.ObjectId(campaignId),
                productId: new Types.ObjectId(productId),
            },
            update: { $set: { isDeleted: false } },
            upsert: true,
        },
    }));

    // Perform bulk write
    await CampaignProductModel.bulkWrite(operations);

    // Return the added products
    return CampaignProductModel.find({
        campaignId: new Types.ObjectId(campaignId),
        productId: { $in: productIds.map((id) => new Types.ObjectId(id)) },
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
        { returnDocument: "after" },
    );

    if (!campaignProduct) throw new ApiError(httpStatus.NOT_FOUND, "Product association with this campaign was not found or has already been removed.");
    return campaignProduct;
};

// Remove multiple products from a campaign
const removeMultipleProductsFromCampaign = async (campaignId: string, productIds: string[]) => {
    const result = await CampaignProductModel.updateMany(
        {
            campaignId: new Types.ObjectId(campaignId),
            productId: { $in: productIds.map((id) => new Types.ObjectId(id)) },
            isDeleted: false,
        },
        { $set: { isDeleted: true } },
    );
    return result;
};

// Get all products in a campaign with pagination
const getProductsByCampaign = async (campaignId: string, query: any = {}) => {
    const filter: any = { campaignId: new Types.ObjectId(campaignId), isDeleted: false };

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const campaignProducts = await CampaignProductModel.find(filter).populate("productId").sort({ createdAt: -1 }).skip(skip).limit(limit);

    const total = await CampaignProductModel.countDocuments(filter);

    return {
        data: campaignProducts.map((cp) => cp.productId).filter((product: any) => product && !product.isDeleted), // Return just valid non-deleted products
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

    return campaignProducts.map((cp) => cp.campaignId);
};

// Get products of ALL campaigns created by or belonging to the logged-in ADMIN
const getMyCampaignProducts = async (user: any, query: any = {}) => {
    const { GroupModel } = await import("../group/group.model");

    let campaignIds: Types.ObjectId[] = [];

    // 0. Explicit campaignId or groupId passed in query
    if (query.campaignId) {
        campaignIds = [new Types.ObjectId(query.campaignId)];
    } else if (query.groupId) {
        const campaigns = await CampaignModel.find({
            groupId: new Types.ObjectId(query.groupId),
            isDeleted: false,
        }).select("_id").lean();
        campaignIds = campaigns.map((c) => c._id);
    } else {
        // 1. Find all groups created by admin
        const adminGroups = await GroupModel.find({
            createdBy: user._id,
            isDeleted: false,
        }).select("_id").lean();
        const groupIds = adminGroups.map((g) => g._id);

        // 2. Find all campaigns created by admin or belonging to admin groups
        const adminCampaigns = await CampaignModel.find({
            $or: [{ createdBy: user._id }, { groupId: { $in: groupIds } }],
            isDeleted: false,
        }).select("_id").lean();

        campaignIds = adminCampaigns.map((c) => c._id);
    }

    if (campaignIds.length === 0) {
        return {
            data: [],
            pagination: {
                page: 1,
                limit: parseInt(query.limit as string) || 10,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
            },
        };
    }

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const baseMatch = { campaignId: { $in: campaignIds }, isDeleted: false };

    // Get distinct unique productIds across all selected campaigns
    const uniqueProductIds = await CampaignProductModel.distinct("productId", baseMatch);

    if (uniqueProductIds.length === 0) {
        return {
            data: [],
            pagination: {
                page: 1,
                limit,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
            },
        };
    }

    const productFilter = {
        _id: { $in: uniqueProductIds },
        isDeleted: false,
        isActive: true,
    };

    const total = await ProductModel.countDocuments(productFilter);

    // Fetch actual unique product documents with pagination
    const products = await ProductModel.find(productFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    return {
        data: products,
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

// Get all products in a campaign by campaign code
const getProductsByCampaignCode = async (code: string, query: any = {}) => {
    const campaign = await CampaignModel.findOne({ code, isDeleted: false });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, `Campaign with code "${code}" was not found or has been deleted.`);

    return getProductsByCampaign(campaign._id.toString(), query);
};

export const campaignProductServices = {
    addProductToCampaign,
    addMultipleProductsToCampaign,
    removeProductFromCampaign,
    removeMultipleProductsFromCampaign,
    getProductsByCampaign,
    getCampaignsByProduct,
    getMyCampaignProducts,
    getProductsByCampaignCode,
};
