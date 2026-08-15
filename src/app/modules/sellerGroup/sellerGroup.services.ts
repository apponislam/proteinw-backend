import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { SellerGroupModel } from "./sellerGroup.model";
import { GroupModel } from "../group/group.model";
import { UserModel } from "../auth/auth.model";
import { activityLogServices } from "../activityLog/activityLog.services";

const joinGroup = async (sellerId: string, groupId: string) => {
    // 1. Check user exists and is a SELLER
    const seller = await UserModel.findOne({ _id: sellerId, isDeleted: false });
    if (!seller) {
        throw new ApiError(httpStatus.NOT_FOUND, "Seller user not found.");
    }
    if (seller.role !== "SELLER") {
        throw new ApiError(httpStatus.FORBIDDEN, "Only users with role SELLER can join groups.");
    }

    // 2. Check target group exists and is active
    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) {
        throw new ApiError(httpStatus.NOT_FOUND, "Target group was not found or has been deleted.");
    }
    if (!group.isActive) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Cannot join an inactive group.");
    }

    // 3. Check if seller is already joined to this group
    const existingJoin = await SellerGroupModel.findOne({
        sellerId: new Types.ObjectId(sellerId),
        groupId: new Types.ObjectId(groupId),
        isDeleted: false,
    });
    if (existingJoin) {
        throw new ApiError(httpStatus.BAD_REQUEST, "You have already joined this group.");
    }

    // 4. Create join record
    const joinRecord = await SellerGroupModel.create({
        sellerId: new Types.ObjectId(sellerId),
        groupId: new Types.ObjectId(groupId),
    });



    // 5. If active campaign exists for this group, join seller to campaign as well
    try {
        const { CampaignModel } = await import("../campaign/campaign.model");
        const { CampaignSellerModel } = await import("../campaignSeller/campaignSeller.model");

        const activeCampaign = await CampaignModel.findOne({
            groupId: new Types.ObjectId(groupId),
            isDeleted: false,
            status: "ACTIVE",
        });

        if (activeCampaign) {
            const existingCampaignSeller = await CampaignSellerModel.findOne({
                sellerId: new Types.ObjectId(sellerId),
                campaignId: activeCampaign._id,
                isDeleted: false,
            });
            if (!existingCampaignSeller) {
                await CampaignSellerModel.create({
                    sellerId: new Types.ObjectId(sellerId),
                    campaignId: activeCampaign._id,
                });
            }
        }
    } catch (campaignError) {
        console.error("Failed to auto-join seller to active campaign:", campaignError);
    }

    // 6. Log activity safely without breaking
    try {
        await activityLogServices.createActivityLog({
            groupId: new Types.ObjectId(groupId),
            type: "MEMBER",
            title: "New Member Joined Group",
            description: `${seller.name} joined ${group.name}`,
        });
    } catch (activityError) {
        console.error("Failed to create activity log for seller group join:", activityError);
    }

    return joinRecord;
};

const joinGroupByInvitationCode = async (sellerId: string, invitationCode: string) => {
    const { invitationServices } = await import("../invitation/invitation.services");

    // 1. Verify invitation by code
    const invitation = await invitationServices.getInvitationByCode(invitationCode);

    // 2. Extract raw groupId string (whether populated object or ObjectId)
    const targetGroupId = typeof invitation.groupId === "object" && (invitation.groupId as any)._id
        ? (invitation.groupId as any)._id.toString()
        : invitation.groupId.toString();

    // 3. Join group (automatically auto-joins active campaign)
    const joinRecord = await joinGroup(sellerId, targetGroupId);

    // 4. Accept invitation
    await invitationServices.acceptInvitation(invitation.email);

    return joinRecord;
};

const getMyJoinedGroups = async (sellerId: string, query: any = {}) => {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const joins = await SellerGroupModel.find({
        sellerId: new Types.ObjectId(sellerId),
        isDeleted: false,
    })
        .populate("groupId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const { CampaignModel } = await import("../campaign/campaign.model");
    const { OrderModel } = await import("../order/order.model");
    const { TierModel } = await import("../tier/tier.model");

    const tiers = await TierModel.find({ isActive: true, isDeleted: false }).sort({ minSalesVolume: 1 });

    const groupsWithDetails = await Promise.all(
        joins.map(async (join: any) => {
            const groupDoc = join.groupId;
            if (!groupDoc || groupDoc.isDeleted) return null;

            // Find active campaign for this group
            const campaign = await CampaignModel.findOne({ groupId: groupDoc._id, isDeleted: false, status: "ACTIVE" }).populate("tierId");

            let totalPackagesSold = 0;
            let totalRevenue = 0;

            const orderMatch: any = {
                status: { $ne: "cancelled" },
                isDeleted: false,
            };

            if (campaign) {
                orderMatch.$or = [{ groupId: groupDoc._id }, { campaignId: campaign._id }];
            } else {
                orderMatch.groupId = groupDoc._id;
            }

            const ordersStats = await OrderModel.aggregate([
                { $match: orderMatch },
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

            const currentTier = tiers.find((t) => totalPackagesSold >= t.minSalesVolume && (t.maxSalesVolume === undefined || t.maxSalesVolume === null || totalPackagesSold <= t.maxSalesVolume));
            const nextTier = tiers.find((t) => t.minSalesVolume > totalPackagesSold);
            const packagesNeededForNextTier = nextTier ? nextTier.minSalesVolume - totalPackagesSold : 0;

            return {
                ...groupDoc,
                runningCampaign: campaign || null,
                tierInfo: {
                    totalPackagesSold,
                    totalRevenue,
                    currentTier: currentTier || null,
                    nextTier: nextTier || null,
                    packagesNeededForNextTier,
                },
            };
        }),
    );

    const validGroups = groupsWithDetails.filter(Boolean);

    const total = await SellerGroupModel.countDocuments({
        sellerId: new Types.ObjectId(sellerId),
        isDeleted: false,
    });

    return {
        data: validGroups,
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

const getGroupSellers = async (groupId: string, query: any = {}) => {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const joins = await SellerGroupModel.find({
        groupId: new Types.ObjectId(groupId),
        isDeleted: false,
    })
        .populate("sellerId", "-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await SellerGroupModel.countDocuments({
        groupId: new Types.ObjectId(groupId),
        isDeleted: false,
    });

    return {
        data: joins,
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

export const sellerGroupServices = {
    joinGroup,
    joinGroupByInvitationCode,
    getMyJoinedGroups,
    getGroupSellers,
};
