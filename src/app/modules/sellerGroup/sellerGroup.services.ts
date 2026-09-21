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
        throw new ApiError(httpStatus.NOT_FOUND, "Säljaranvändaren hittades inte.");
    }
    if (seller.role !== "SELLER") {
        throw new ApiError(httpStatus.FORBIDDEN, "Endast användare med rollen SÄLJARE kan gå med i grupper.");
    }

    // 2. Check target group exists and is active
    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) {
        throw new ApiError(httpStatus.NOT_FOUND, "Målgruppen hittades inte eller har raderats.");
    }
    if (!group.isActive) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Kan inte gå med i en inaktiv grupp.");
    }

    // 3. Check if seller is already joined to this group
    const existingJoin = await SellerGroupModel.findOne({
        sellerId: new Types.ObjectId(sellerId),
        groupId: new Types.ObjectId(groupId),
        isDeleted: false,
    });
    if (existingJoin) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Du har redan gått med i denna grupp.");
    }

    // 4. Create join record
    const joinRecord = await SellerGroupModel.create({
        sellerId: new Types.ObjectId(sellerId),
        groupId: new Types.ObjectId(groupId),
    });



    // 5. Log activity safely without breaking
    try {
        await activityLogServices.createActivityLog({
            groupId: new Types.ObjectId(groupId),
            type: "MEMBER",
            title: "Ny medlem i gruppen",
            description: `${seller.name} gick med i ${group.name}`,
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

    // 3. Join group
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

    const groupsWithDetails = await Promise.all(
        joins.map(async (join: any) => {
            const groupDoc = join.groupId;
            if (!groupDoc || groupDoc.isDeleted) return null;

            const [totalSellers, totalActiveCampaigns, totalCampaigns] = await Promise.all([
                SellerGroupModel.countDocuments({ groupId: groupDoc._id, isDeleted: false }),
                CampaignModel.countDocuments({ groupId: groupDoc._id, isDeleted: false, status: "ACTIVE" }),
                CampaignModel.countDocuments({ groupId: groupDoc._id, isDeleted: false }),
            ]);

            const groupOrdersStats = await OrderModel.aggregate([
                {
                    $match: {
                        groupId: groupDoc._id,
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

            const groupPackagesSold = groupOrdersStats[0]?.totalPackagesSold || 0;
            const groupRevenue = groupOrdersStats[0]?.totalRevenue || 0;

            return {
                ...groupDoc,
                totalSellers,
                totalActiveCampaigns,
                totalCampaigns,
                totalPackagesSold: groupPackagesSold,
                totalRevenue: groupRevenue,
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
