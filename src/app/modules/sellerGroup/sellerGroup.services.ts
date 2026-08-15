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



    // 5. Log activity safely without breaking
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
    const { CampaignModel } = await import("../campaign/campaign.model");
    const { CampaignSellerModel } = await import("../campaignSeller/campaignSeller.model");

    // 1. Verify invitation by code
    const invitation = await invitationServices.getInvitationByCode(invitationCode);

    // 2. Join group
    const joinRecord = await joinGroup(sellerId, invitation.groupId.toString());

    // 3. If there is an active campaign for this group, also join seller to campaign
    const activeCampaign = await CampaignModel.findOne({
        groupId: invitation.groupId,
        isDeleted: false,
        status: "ACTIVE",
        endDate: { $gt: new Date() },
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
        .limit(limit);

    const total = await SellerGroupModel.countDocuments({
        sellerId: new Types.ObjectId(sellerId),
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
