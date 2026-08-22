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
        throw new ApiError(httpStatus.BAD_REQUEST, "Cannot add sellers because campaign is not active.");
    }

    // 3. Ensure seller is also attached to campaign's group if groupId exists
    if (campaign.groupId) {
        try {
            const { SellerGroupModel } = await import("../sellerGroup/sellerGroup.model");
            const existingGroupJoin = await SellerGroupModel.findOne({
                sellerId: new Types.ObjectId(sellerId),
                groupId: campaign.groupId as Types.ObjectId,
            });

            if (!existingGroupJoin) {
                await SellerGroupModel.create({
                    sellerId: new Types.ObjectId(sellerId),
                    groupId: campaign.groupId as Types.ObjectId,
                });
            } else if (existingGroupJoin.isDeleted) {
                existingGroupJoin.isDeleted = false;
                await existingGroupJoin.save();
            }
        } catch (groupError) {
            console.error("Failed to auto-join seller to campaign group:", groupError);
        }
    }

    // 4. Check if seller join record already exists
    const existingJoin = await CampaignSellerModel.findOne({
        sellerId: new Types.ObjectId(sellerId),
        campaignId: new Types.ObjectId(campaignId),
    });

    if (existingJoin) {
        if (!existingJoin.isDeleted) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Seller has already joined this campaign.");
        }
        // If previously removed (isDeleted: true), restore it
        existingJoin.isDeleted = false;
        existingJoin.joinedAt = new Date();
        await existingJoin.save();
        return existingJoin;
    }

    // 5. Create join record
    const joinRecord = await CampaignSellerModel.create({
        sellerId: new Types.ObjectId(sellerId),
        campaignId: new Types.ObjectId(campaignId),
    });

    // 6. Log activity safely
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

    const pipeline: any[] = [
        {
            $match: {
                sellerId: new Types.ObjectId(sellerId),
                isDeleted: false,
            },
        },
        {
            $lookup: {
                from: "campaigns",
                localField: "campaignId",
                foreignField: "_id",
                as: "campaignId",
            },
        },
        { $unwind: "$campaignId" },
        {
            $match: {
                "campaignId.isDeleted": false,
                ...(query.status ? { "campaignId.status": query.status } : {}),
            },
        },
        { $sort: { createdAt: -1 } },
        {
            $facet: {
                data: [{ $skip: skip }, { $limit: limit }],
                totalCount: [{ $count: "count" }],
            },
        },
    ];

    const result = await CampaignSellerModel.aggregate(pipeline);
    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    return {
        data,
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
        .populate({
            path: "sellerId",
            select: "-password -verificationToken -verificationCode -verificationExpiry",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const { OrderModel } = await import("../order/order.model");

    const sellersWithStats = await Promise.all(
        joins.map(async (join: any) => {
            const seller = join.sellerId;
            if (!seller) return null;

            const sellerStats = await OrderModel.aggregate([
                {
                    $match: {
                        campaignId: new Types.ObjectId(campaignId),
                        memberId: new Types.ObjectId(seller._id),
                        isDeleted: false,
                        status: { $ne: "cancelled" },
                    },
                },
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

    const sellers = sellersWithStats.filter(Boolean);

    const total = await CampaignSellerModel.countDocuments({
        campaignId: new Types.ObjectId(campaignId),
        isDeleted: false,
    });

    return {
        data: sellers,
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

const addSellersToCampaign = async (campaignId: string, sellerIdsInput: string | string[]) => {
    const sellerIds = Array.isArray(sellerIdsInput) ? sellerIdsInput : [sellerIdsInput];
    if (!sellerIds || sellerIds.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, "sellerId or sellerIds array is required.");
    }

    const results = [];
    let firstErrorMsg = "";

    for (const sellerId of sellerIds) {
        try {
            const result = await joinCampaign(sellerId, campaignId);
            results.push(result);
        } catch (err: any) {
            if (!firstErrorMsg) {
                firstErrorMsg = err?.message || "Failed to add seller to campaign.";
            }
        }
    }

    if (results.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, firstErrorMsg || "No sellers could be added to this campaign.");
    }

    return {
        message: "Seller(s) added to campaign successfully",
        count: results.length,
        sellers: results,
    };
};

const removeSellersFromCampaign = async (campaignId: string, sellerIdsInput: string | string[]) => {
    const sellerIds = Array.isArray(sellerIdsInput) ? sellerIdsInput : [sellerIdsInput];
    if (!sellerIds || sellerIds.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, "sellerId or sellerIds array is required.");
    }

    const objectIds = sellerIds.map((id) => new Types.ObjectId(id));

    const result = await CampaignSellerModel.updateMany(
        {
            campaignId: new Types.ObjectId(campaignId),
            sellerId: { $in: objectIds },
            isDeleted: false,
        },
        { $set: { isDeleted: true } },
    );

    return { message: "Seller(s) removed from campaign successfully", count: result.modifiedCount };
};

export const campaignSellerServices = {
    joinCampaign,
    addSellersToCampaign,
    removeSellersFromCampaign,
    getMyJoinedCampaigns,
    getCampaignSellers,
};
