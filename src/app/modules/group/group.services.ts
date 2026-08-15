import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { GroupModel } from "./group.model";
import { UserModel } from "../auth/auth.model";
import { OrderModel } from "../order/order.model";
import { TierModel } from "../tier/tier.model";
import { SellerGroupModel } from "../sellerGroup/sellerGroup.model";
import { CampaignModel } from "../campaign/campaign.model";

const createGroup = async (userId: string, payload: any) => {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    if (user.role === "ADMIN" && !user.isApproved) {
        throw new ApiError(httpStatus.FORBIDDEN, "Your admin account has not been approved yet. You cannot create a group.");
    }

    const group = await GroupModel.create({
        ...payload,
        createdBy: new Types.ObjectId(userId),
    });

    return group;
};

const getAllGroups = async (query: any = {}) => {
    const filter: any = { isDeleted: false };
    if (query.isActive !== undefined) filter.isActive = query.isActive === "true";

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const groups = await GroupModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await GroupModel.countDocuments(filter);

    return {
        data: groups,
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

const getActiveGroups = async () => {
    const groups = await GroupModel.find({ isActive: true, isDeleted: false }).sort({ endDate: 1, createdAt: -1 });
    return groups;
};

const getGroupById = async (groupId: string) => {
    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Requested group was not found or has been deleted.");
    return group;
};

const getGroupByCode = async (code: string) => {
    const group = await GroupModel.findOne({ code, isDeleted: false });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, `Group with code "${code}" was not found or has been deleted.`);
    return group;
};

const updateGroup = async (groupId: string, payload: any) => {
    const group = await GroupModel.findOneAndUpdate({ _id: groupId, isDeleted: false }, { $set: payload }, { returnDocument: "after", runValidators: true });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Requested group was not found or has been deleted.");
    return group;
};

const toggleGroupStatus = async (groupId: string) => {
    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Requested group was not found or has been deleted.");
    group.isActive = !group.isActive;
    await group.save();
    return group;
};

const deleteGroup = async (groupId: string) => {
    const group = await GroupModel.findOneAndUpdate({ _id: groupId, isDeleted: false }, { $set: { isDeleted: true, isActive: false } }, { returnDocument: "after" });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Requested group was not found or has already been deleted.");
    return group;
};

const getMyGroup = async (userId: string | Types.ObjectId) => {
    // 1. Try finding group created by this admin
    let group = await GroupModel.findOne({ createdBy: new Types.ObjectId(userId), isDeleted: false });

    // 2. If not created by admin, try finding group joined by this seller
    if (!group) {
        const sellerGroupJoin = await SellerGroupModel.findOne({ sellerId: new Types.ObjectId(userId), isDeleted: false });
        if (sellerGroupJoin) {
            group = await GroupModel.findOne({ _id: sellerGroupJoin.groupId, isDeleted: false });
        }
    }

    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "No group was found for this user.");

    // Find active campaign for this group
    const activeCampaign = await CampaignModel.findOne({ groupId: group._id, isDeleted: false, status: "ACTIVE" }).populate("tierId");

    // Calculate total packages sold for the group's campaign
    const campaignId = activeCampaign?._id;
    let totalPackagesSold = 0;
    let totalRevenue = 0;
    if (campaignId) {
        const ordersStats = await OrderModel.aggregate([
            {
                $match: {
                    campaignId: campaignId,
                    status: { $ne: "cancelled" },
                    isDeleted: false,
                },
            },
            {
                $group: {
                    _id: null,
                    totalPackagesSold: { $sum: "$totalPackage" },
                    totalRevenue: { $sum: "$totalPrice" },
                },
            },
        ]);
        totalPackagesSold = ordersStats[0]?.totalPackagesSold || 0;
        totalRevenue = ordersStats[0]?.totalRevenue || 0;
    }

    // Fetch all active tiers
    const tiers = await TierModel.find({ isActive: true, isDeleted: false }).sort({ minSalesVolume: 1 });

    // Determine current tier
    const currentTier = tiers.find((t) => totalPackagesSold >= t.minSalesVolume && (t.maxSalesVolume === undefined || t.maxSalesVolume === null || totalPackagesSold <= t.maxSalesVolume));

    // Determine next tier
    const nextTier = tiers.find((t) => t.minSalesVolume > totalPackagesSold);

    const packagesNeededForNextTier = nextTier ? nextTier.minSalesVolume - totalPackagesSold : 0;

    // Convert group document to plain object so we can add custom fields
    const groupObj = group.toObject();

    return {
        ...groupObj,
        runningCampaign: activeCampaign || null,
        tierInfo: {
            totalPackagesSold,
            totalRevenue,
            currentTier: currentTier || null,
            nextTier: nextTier || null,
            packagesNeededForNextTier,
        },
    };
};

const getMyCampaignStats = async (userId: string | Types.ObjectId) => {
    // 1. Try finding group created by this admin
    let group = await GroupModel.findOne({ createdBy: new Types.ObjectId(userId), isDeleted: false });

    // 2. If not created by admin, try finding group joined by this seller
    if (!group) {
        const sellerGroupJoin = await SellerGroupModel.findOne({ sellerId: new Types.ObjectId(userId), isDeleted: false });
        if (sellerGroupJoin) {
            group = await GroupModel.findOne({ _id: sellerGroupJoin.groupId, isDeleted: false });
        }
    }

    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "No group was found for this user.");

    const activeCampaign = await CampaignModel.findOne({ groupId: group._id, isDeleted: false, status: "ACTIVE" });
    const campaignId = activeCampaign?._id;
    let totalPackagesSold = 0;
    let totalRevenue = 0;
    if (campaignId) {
        const ordersStats = await OrderModel.aggregate([
            {
                $match: {
                    campaignId: campaignId,
                    status: { $ne: "cancelled" },
                    isDeleted: false,
                },
            },
            {
                $group: {
                    _id: null,
                    totalPackagesSold: { $sum: "$totalPackage" },
                    totalRevenue: { $sum: "$totalPrice" },
                },
            },
        ]);
        totalPackagesSold = ordersStats[0]?.totalPackagesSold || 0;
        totalRevenue = ordersStats[0]?.totalRevenue || 0;
    }

    // Fetch all active tiers
    const tiers = await TierModel.find({ isActive: true, isDeleted: false }).sort({ minSalesVolume: 1 });

    // Determine current tier
    const currentTier = tiers.find((t) => totalPackagesSold >= t.minSalesVolume && (t.maxSalesVolume === undefined || t.maxSalesVolume === null || totalPackagesSold <= t.maxSalesVolume));

    // Determine next tier
    const nextTier = tiers.find((t) => t.minSalesVolume > totalPackagesSold);

    const packagesNeededForNextTier = nextTier ? nextTier.minSalesVolume - totalPackagesSold : 0;

    return {
        totalPackagesSold,
        totalRevenue,
        currentTier: currentTier || null,
        nextTier: nextTier || null,
        packagesNeededForNextTier,
    };
};

export const groupServices = {
    createGroup,
    getAllGroups,
    getActiveGroups,
    getGroupById,
    getGroupByCode,
    updateGroup,
    toggleGroupStatus,
    deleteGroup,
    getMyGroup,
    getMyCampaignStats,
};
