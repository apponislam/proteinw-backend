import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { CampaignModel } from "./campaign.model";
import { GroupModel } from "../group/group.model";
import { UserModel } from "../auth/auth.model";
import { activityLogServices } from "../activityLog/activityLog.services";

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

const getActiveCampaigns = async () => {
    const campaigns = await CampaignModel.find({ isActive: true, isDeleted: false }).sort({ endDate: 1, createdAt: -1 });
    return campaigns;
};

const getCampaignById = async (campaignId: string) => {
    const campaign = await CampaignModel.findOne({ _id: campaignId, isDeleted: false });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Campaign not found");
    return campaign;
};

const getCampaignByCode = async (code: string) => {
    const campaign = await CampaignModel.findOne({ code, isDeleted: false });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Campaign not found");
    return campaign;
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

export const campaignServices = {
    createCampaign,
    getAllCampaigns,
    getActiveCampaigns,
    getCampaignById,
    getCampaignByCode,
    getCampaignsByGroup,
    updateCampaign,
    toggleCampaignStatus,
    deleteCampaign,
};
