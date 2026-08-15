import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { CampaignSellerModel } from "./campaignSeller.model";
import { CampaignModel } from "../campaign/campaign.model";
import { UserModel } from "../auth/auth.model";
import { activityLogServices } from "../activityLog/activityLog.services";

const joinCampaign = async (sellerId: string, campaignId: string) => {
    // 1. Check user exists and is SELLER
    const seller = await UserModel.findOne({ _id: sellerId, isDeleted: false });
    if (!seller) {
        throw new ApiError(httpStatus.NOT_FOUND, "Seller user not found.");
    }
    if (seller.role !== "SELLER") {
        throw new ApiError(httpStatus.FORBIDDEN, "Only users with role SELLER can join campaigns.");
    }

    // 2. Check target campaign exists and is active
    const campaign = await CampaignModel.findOne({ _id: campaignId, isDeleted: false });
    if (!campaign) {
        throw new ApiError(httpStatus.NOT_FOUND, "Target campaign was not found or has been deleted.");
    }
    if (campaign.status !== "ACTIVE") {
        throw new ApiError(httpStatus.BAD_REQUEST, "Cannot join a campaign that is not in ACTIVE status.");
    }

    // 3. Check if seller is already joined to this campaign
    const existingJoin = await CampaignSellerModel.findOne({
        sellerId: new Types.ObjectId(sellerId),
        campaignId: new Types.ObjectId(campaignId),
        isDeleted: false,
    });
    if (existingJoin) {
        throw new ApiError(httpStatus.BAD_REQUEST, "You have already joined this campaign.");
    }

    // 4. Create join record
    const joinRecord = await CampaignSellerModel.create({
        sellerId: new Types.ObjectId(sellerId),
        campaignId: new Types.ObjectId(campaignId),
    });



    // 5. Log activity safely
    try {
        if (campaign.groupId) {
            await activityLogServices.createActivityLog({
                groupId: campaign.groupId as Types.ObjectId,
                type: "CAMPAIGN",
                title: "Seller Joined Campaign",
                description: `${seller.name} joined campaign ${campaign.name}`,
            });
        }
    } catch (activityError) {
        console.error("Failed to create activity log for seller campaign join:", activityError);
    }

    return joinRecord;
};

const getMyJoinedCampaigns = async (sellerId: string, query: any = {}) => {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const joins = await CampaignSellerModel.find({
        sellerId: new Types.ObjectId(sellerId),
        isDeleted: false,
    })
        .populate("campaignId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await CampaignSellerModel.countDocuments({
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

const getCampaignSellers = async (campaignId: string, query: any = {}) => {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const joins = await CampaignSellerModel.find({
        campaignId: new Types.ObjectId(campaignId),
        isDeleted: false,
    })
        .populate("sellerId", "-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await CampaignSellerModel.countDocuments({
        campaignId: new Types.ObjectId(campaignId),
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

export const campaignSellerServices = {
    joinCampaign,
    getMyJoinedCampaigns,
    getCampaignSellers,
};
