import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { CampaignModel } from "./campaign.model";
import { GroupModel } from "../group/group.model";
import { UserModel } from "../auth/auth.model";
import { OrderModel } from "../order/order.model";
import { CampaignProductModel } from "../campaignProduct/campaignProduct.model";
import { ProductModel } from "../product/product.model";
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
    // Check if group exists
    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Group not found");

    // Check if there's an active campaign for this group
    const activeCampaign = await CampaignModel.findOne({
        groupId: new Types.ObjectId(groupId),
        isDeleted: false,
        $or: [{ isActive: true }, { endDate: { $gt: new Date() } }],
    });
    if (activeCampaign) throw new ApiError(httpStatus.BAD_REQUEST, "You are already running a campaign");

    // Create the campaign
    const campaign = await CampaignModel.create({
        ...payload,
        target: group.goal,
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

    // Update group to set runningCampaignId
    await GroupModel.findOneAndUpdate({ _id: groupId }, { $set: { runningCampaignId: campaign._id } });

    // Assign this campaign to all users in the group
    await UserModel.updateMany({ groupAssigned: new Types.ObjectId(groupId), isDeleted: false }, { $set: { campaignAssigned: campaign._id } });

    return campaign;
};

const getAllCampaigns = async (query: any = {}) => {
    const filter: any = { isDeleted: false };
    if (query.isActive !== undefined) filter.isActive = query.isActive === "true";

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const campaigns = await CampaignModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
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
    if (query.isActive !== undefined) filter.isActive = query.isActive === "true";

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const campaigns = await CampaignModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
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
    const campaigns = await CampaignModel.find({ isActive: true, isDeleted: false }).sort({ endDate: 1, createdAt: -1 });
    return campaigns;
};

const getCampaignById = async (campaignId: string) => {
    const campaign = await CampaignModel.findOne({ _id: campaignId, isDeleted: false }).lean();
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Campaign not found");

    const stats = await getCampaignStats(campaign._id as Types.ObjectId);

    // 1. Fetch Campaign Admin (createdBy user details)
    let campaignAdmin = null;
    if (campaign.createdBy) {
        campaignAdmin = await UserModel.findOne({ _id: campaign.createdBy, isDeleted: false }, { password: 0 }).lean();
    }

    // 2. Fetch Campaign Sellers
    const sellers = await UserModel.find(
        {
            $or: [{ campaignAssigned: campaign._id }, { groupAssigned: campaign.groupId }],
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
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Campaign not found");

    const stats = await getCampaignStats(campaign._id as Types.ObjectId);
    return {
        ...campaign,
        totalPackagesSold: stats.totalPackagesSold,
        totalRevenueSold: stats.totalRevenueSold,
    };
};

const getCampaignsByGroup = async (groupId: string, query: any = {}) => {
    const filter: any = { groupId, isDeleted: false };
    if (query.isActive !== undefined) filter.isActive = query.isActive === "true";

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const campaigns = await CampaignModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
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
    const campaign = await CampaignModel.findOneAndUpdate({ _id: campaignId, isDeleted: false }, { $set: payload }, { returnDocument: "after", runValidators: true });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Campaign not found");
    return campaign;
};

const toggleCampaignStatus = async (campaignId: string) => {
    const campaign = await CampaignModel.findOne({ _id: campaignId, isDeleted: false });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Campaign not found");
    campaign.isActive = !campaign.isActive;
    await campaign.save();
    return campaign;
};

const deleteCampaign = async (campaignId: string) => {
    const campaign = await CampaignModel.findOneAndUpdate({ _id: campaignId, isDeleted: false }, { $set: { isDeleted: true, isActive: false } }, { returnDocument: "after" });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Campaign not found");

    // Remove campaign from all users
    await UserModel.updateMany({ campaignAssigned: new Types.ObjectId(campaignId) }, { $unset: { campaignAssigned: "" } });

    // Remove runningCampaignId from group
    if (campaign.groupId) {
        await GroupModel.findOneAndUpdate({ _id: campaign.groupId }, { $unset: { runningCampaignId: "" } });
    }

    return campaign;
};

const getRunningCampaignByGroup = async (groupId: string) => {
    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Group not found");

    if (!group.runningCampaignId) {
        return null;
    }

    const campaign = await CampaignModel.findOne({ _id: group.runningCampaignId, isDeleted: false }).lean();
    if (!campaign) return null;

    const stats = await getCampaignStats(campaign._id as Types.ObjectId);

    return {
        ...campaign,
        totalPackagesSold: stats.totalPackagesSold,
        totalRevenueSold: stats.totalRevenueSold,
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
    updateCampaign,
    toggleCampaignStatus,
    deleteCampaign,
};
