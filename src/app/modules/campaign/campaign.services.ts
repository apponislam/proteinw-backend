import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { CampaignModel } from "./campaign.model";
import { GroupModel } from "../group/group.model";
import { UserModel } from "../auth/auth.model";
import { OrderModel } from "../order/order.model";
import { CampaignProductModel } from "../campaignProduct/campaignProduct.model";
import { CampaignSellerModel } from "../campaignSeller/campaignSeller.model";
import { SellerGroupModel } from "../sellerGroup/sellerGroup.model";
import { TierModel } from "../tier/tier.model";
import { activityLogServices } from "../activityLog/activityLog.services";

const getCampaignStats = async (campaignId: Types.ObjectId) => {
    const ordersResult = await OrderModel.aggregate([
        { $match: { campaignId: new Types.ObjectId(campaignId), isDeleted: false, status: { $ne: "cancelled" } } },
        {
            $group: {
                _id: null,
                totalPackages: { $sum: "$totalPackage" },
                totalRevenue: { $sum: "$totalPrice" },
            },
        },
    ]);
    return ordersResult.length > 0
        ? {
              totalPackagesSold: ordersResult[0].totalPackages,
              totalRevenueSold: ordersResult[0].totalRevenue,
          }
        : { totalPackagesSold: 0, totalRevenueSold: 0 };
};

const createCampaign = async (userId: string, groupId: string, payload: any) => {
    // Validate startDate and endDate
    if (payload.startDate && payload.endDate) {
        const start = new Date(payload.startDate);
        const end = new Date(payload.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid start date or end date format.");
        }
        if (end <= start) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Campaign end date must be after start date.");
        }
        if (end <= new Date()) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Campaign end date must be in the future.");
        }
    } else if (payload.endDate) {
        const end = new Date(payload.endDate);
        if (isNaN(end.getTime()) || end <= new Date()) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Campaign end date must be a valid future date.");
        }
    }

    // Check if group exists
    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Associated group was not found or has been deleted.");

    // Create the campaign
    const campaign = await CampaignModel.create({
        ...payload,
        status: payload.status || "ACTIVE",
        groupId: new Types.ObjectId(groupId),
        createdBy: new Types.ObjectId(userId),
    });

    // Log Activity (Campaign Started)
    try {
        await activityLogServices.createActivityLog({
            groupId: new Types.ObjectId(groupId),
            type: "CAMPAIGN",
            title: "Campaign Started",
            description: `${campaign.name} shop is now officially live`,
        });
    } catch (activityError) {
        console.error("Failed to create activity log for campaign start:", activityError);
    }

    return campaign;
};

const getAllCampaigns = async (query: any = {}) => {
    const filter: any = { isDeleted: false };
    if (query.status) filter.status = query.status;

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const campaigns = await CampaignModel.find(filter).populate("createdBy", "name email role phone photo").sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await CampaignModel.countDocuments(filter);

    return {
        data: campaigns,
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

const getAllCampaignsWithStats = async (query: any = {}) => {
    const filter: any = { isDeleted: false };
    if (query.status) filter.status = query.status;

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const campaigns = await CampaignModel.find(filter).populate("createdBy", "name email role phone photo").sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const total = await CampaignModel.countDocuments(filter);

    const campaignsWithStats = await Promise.all(
        campaigns.map(async (campaign) => {
            const stats = await getCampaignStats(campaign._id as Types.ObjectId);
            return {
                ...campaign,
                totalPackagesSold: stats.totalPackagesSold,
                totalRevenueSold: stats.totalRevenueSold,
            };
        }),
    );

    return {
        data: campaignsWithStats,
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

const getActiveCampaigns = async () => {
    const campaigns = await CampaignModel.find({ status: "ACTIVE", isDeleted: false }).sort({ endDate: 1, createdAt: -1 });
    return campaigns;
};

const getCampaignById = async (campaignId: string) => {
    const campaign = await CampaignModel.findOne({ _id: campaignId, isDeleted: false }).lean();
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Requested campaign was not found or has been deleted.");

    const stats = await getCampaignStats(campaign._id as Types.ObjectId);

    // 1. Fetch Campaign Admin (createdBy user details)
    let campaignAdmin = null;
    if (campaign.createdBy) {
        campaignAdmin = await UserModel.findOne({ _id: campaign.createdBy, isDeleted: false }, { password: 0 }).lean();
    }

    // 2. Fetch Campaign Sellers using CampaignSellerModel & SellerGroupModel
    const campaignSellerJoins = await CampaignSellerModel.find({ campaignId: campaign._id, isDeleted: false }).select("sellerId").lean();
    const campaignSellerIds = campaignSellerJoins.map((cs: any) => cs.sellerId);

    let sellerIds = [...campaignSellerIds];
    if (campaign.groupId) {
        const groupSellerJoins = await SellerGroupModel.find({ groupId: campaign.groupId, isDeleted: false }).select("sellerId").lean();
        const groupSellerIds = groupSellerJoins.map((gs: any) => gs.sellerId);
        const allIdsSet = new Set([...campaignSellerIds.map((id: any) => id.toString()), ...groupSellerIds.map((id: any) => id.toString())]);
        sellerIds = Array.from(allIdsSet).map((id: string) => new Types.ObjectId(id));
    }

    const sellers = await UserModel.find(
        {
            _id: { $in: sellerIds },
            role: "SELLER",
            isDeleted: false,
        },
        { password: 0 },
    ).lean();

    const sellersWithStats = await Promise.all(
        sellers.map(async (seller) => {
            const sellerStats = await OrderModel.aggregate([
                { $match: { campaignId: new Types.ObjectId(campaign._id), memberId: new Types.ObjectId(seller._id), isDeleted: false, status: { $ne: "cancelled" } } },
                {
                    $group: {
                        _id: null,
                        totalPackagesSold: { $sum: "$totalPackage" },
                        totalRevenueSold: { $sum: "$totalPrice" },
                    },
                },
            ]);
            return {
                ...seller,
                totalPackagesSold: sellerStats[0]?.totalPackagesSold || 0,
                totalRevenueSold: sellerStats[0]?.totalRevenueSold || 0,
            };
        }),
    );

    // 3. Fetch Campaign Products
    const campaignProducts = await CampaignProductModel.find({ campaignId: campaign._id, isDeleted: false }).populate("productId").lean();

    const productsWithStats = await Promise.all(
        campaignProducts.map(async (cp: any) => {
            const product = cp.productId;
            if (!product) return null;

            const productStats = await OrderModel.aggregate([
                { $match: { campaignId: new Types.ObjectId(campaign._id), isDeleted: false, status: { $ne: "cancelled" } } },
                { $unwind: "$items" },
                { $match: { "items.productId": new Types.ObjectId(product._id) } },
                {
                    $group: {
                        _id: null,
                        totalSold: { $sum: "$items.quantity" },
                    },
                },
            ]);

            return {
                ...product,
                totalSold: productStats[0]?.totalSold || 0,
            };
        }),
    );

    const filteredProducts = productsWithStats.filter(Boolean);

    return {
        ...campaign,
        totalPackagesSold: stats.totalPackagesSold,
        totalRevenueSold: stats.totalRevenueSold,
        campaignAdmin,
        sellers: sellersWithStats,
        products: filteredProducts,
    };
};

const getCampaignByCode = async (code: string) => {
    const campaign = await CampaignModel.findOne({ code, isDeleted: false }).lean();
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, `Campaign with code "${code}" was not found or has been deleted.`);

    const stats = await getCampaignStats(campaign._id as Types.ObjectId);
    return {
        ...campaign,
        totalPackagesSold: stats.totalPackagesSold,
        totalRevenueSold: stats.totalRevenueSold,
    };
};

const getCampaignsByGroup = async (groupId: string, query: any = {}) => {
    const filter: any = { groupId, isDeleted: false };
    if (query.status) filter.status = query.status;

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const campaigns = await CampaignModel.find(filter).populate("createdBy", "name email role phone photo").sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await CampaignModel.countDocuments(filter);

    return {
        data: campaigns,
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

const updateCampaign = async (campaignId: string, payload: any) => {
    if (payload.startDate && payload.endDate) {
        const start = new Date(payload.startDate);
        const end = new Date(payload.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid start date or end date format.");
        }
        if (end <= start) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Campaign end date must be after start date.");
        }
        if (end <= new Date()) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Campaign end date must be in the future.");
        }
    } else if (payload.endDate) {
        const end = new Date(payload.endDate);
        if (isNaN(end.getTime()) || end <= new Date()) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Campaign end date must be a valid future date.");
        }
    }

    // If endDate is updated into the future, auto-set status to ACTIVE if it was FULFILMENT
    const updateData = { ...payload };
    if (payload.endDate) {
        const end = new Date(payload.endDate);
        if (end > new Date() && (!payload.status || payload.status === "FULFILMENT")) {
            updateData.status = "ACTIVE";
        }
    }

    const campaign = await CampaignModel.findOneAndUpdate({ _id: campaignId, isDeleted: false }, { $set: updateData }, { returnDocument: "after", runValidators: true });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Requested campaign was not found or has been deleted.");
    return campaign;
};

const updateCampaignStatus = async (campaignId: string, status: "DRAFT" | "ACTIVE" | "FULFILMENT" | "COMPLETED") => {
    const validStatuses = ["DRAFT", "ACTIVE", "FULFILMENT", "COMPLETED"];
    if (!validStatuses.includes(status)) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Invalid campaign status "${status}". Allowed values: ${validStatuses.join(", ")}`);
    }

    const campaign = await CampaignModel.findOne({ _id: campaignId, isDeleted: false });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Requested campaign was not found or has been deleted.");

    campaign.status = status;
    await campaign.save();
    return campaign;
};

const toggleCampaignStatus = async (campaignId: string) => {
    const campaign = await CampaignModel.findOne({ _id: campaignId, isDeleted: false });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Requested campaign was not found or has been deleted.");

    campaign.status = campaign.status === "ACTIVE" ? "FULFILMENT" : "ACTIVE";
    await campaign.save();
    return campaign;
};

const deleteCampaign = async (campaignId: string) => {
    const campaign = await CampaignModel.findOneAndUpdate({ _id: campaignId, isDeleted: false }, { $set: { isDeleted: true } }, { returnDocument: "after" });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Requested campaign was not found or has already been deleted.");

    return campaign;
};

const assignTierToCampaign = async (campaignId: string, tierId: string) => {
    const campaign = await CampaignModel.findOne({ _id: campaignId, isDeleted: false });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Requested campaign was not found or has been deleted.");

    const tier = await TierModel.findOne({ _id: tierId, isDeleted: false });
    if (!tier) throw new ApiError(httpStatus.NOT_FOUND, "Requested tier was not found or has been deleted.");

    campaign.tierId = new Types.ObjectId(tierId);
    await campaign.save();

    return campaign;
};

const getRunningCampaignByGroup = async (groupId: string) => {
    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Associated group was not found or has been deleted.");

    const campaign = await CampaignModel.findOne({ groupId: group._id, isDeleted: false, status: "ACTIVE" }).lean();
    if (!campaign) return null;

    const stats = await getCampaignStats(campaign._id as Types.ObjectId);

    return {
        ...campaign,
        totalPackagesSold: stats.totalPackagesSold,
        totalRevenueSold: stats.totalRevenueSold,
    };
};

const getRunningCampaignForSeller = async (sellerId: string, groupId: string, query: any = {}) => {
    // 1. Get campaign IDs that this seller has explicitly joined from CampaignSellerModel
    const sellerCampaignJoins = await CampaignSellerModel.find({
        sellerId: new Types.ObjectId(sellerId),
        isDeleted: false,
    }).select("campaignId").lean();

    const joinedCampaignIds = sellerCampaignJoins.map((cj) => cj.campaignId);

    if (joinedCampaignIds.length === 0) {
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

    // 2. Build filter matching group ID, joined campaign IDs, and status
    const filter: any = {
        _id: { $in: joinedCampaignIds },
        groupId: new Types.ObjectId(groupId),
        isDeleted: false,
    };

    if (query.status) {
        filter.status = query.status;
    } else {
        filter.status = "ACTIVE";
    }

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const campaigns = await CampaignModel.find(filter)
        .populate("createdBy", "name email role phone photo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await CampaignModel.countDocuments(filter);

    const campaignsWithStats = await Promise.all(
        campaigns.map(async (campaign) => {
            const stats = await getCampaignStats(campaign._id as Types.ObjectId);
            return {
                ...campaign,
                totalPackagesSold: stats.totalPackagesSold,
                totalRevenueSold: stats.totalRevenueSold,
            };
        })
    );

    return {
        data: campaignsWithStats,
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

export const campaignServices = {
    createCampaign,
    getAllCampaigns,
    getAllCampaignsWithStats,
    getActiveCampaigns,
    getCampaignById,
    getCampaignByCode,
    getCampaignsByGroup,
    getRunningCampaignByGroup,
    getRunningCampaignForSeller,
    assignTierToCampaign,
    updateCampaign,
    updateCampaignStatus,
    toggleCampaignStatus,
    deleteCampaign,
};
