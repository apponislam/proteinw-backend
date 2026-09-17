import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { CampaignModel } from "./campaign.model";
import { GroupModel } from "../group/group.model";
import { UserModel } from "../auth/auth.model";
import { OrderModel } from "../order/order.model";
import { CampaignSellerModel } from "../campaignSeller/campaignSeller.model";
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
    const now = new Date();
    // 21 full days (21 * 24 * 60 * 60 * 1000 ms) + 12 hours buffer for timezone/end-of-day times (e.g. 23:59:59)
    const twentyOneDaysInMs = (21 * 24 * 60 * 60 * 1000) + (12 * 60 * 60 * 1000);

    console.log("📌 createCampaign raw payload dates:", {
        startDate: payload.startDate,
        endDate: payload.endDate,
        now: now.toISOString(),
    });

    // Helper function to extract [YYYY, MM, DD] regardless of ISO string format or local timezone offset
    const parseCalendarDate = (d: Date | string): [number, number, number] => {
        const dateObj = typeof d === "string" ? new Date(d) : d;
        // If string starts with YYYY-MM-DD format e.g. "2026-10-06" or "2026-10-06T...", extract directly to prevent timezone shifting
        if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)) {
            const parts = d.substring(0, 10).split("-").map(Number);
            return [parts[0], parts[1] - 1, parts[2]];
        }
        return [dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()];
    };

    if (payload.startDate && payload.endDate) {
        const start = new Date(payload.startDate);
        const end = new Date(payload.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Ange giltiga start- och slutdatum för din försäljning.");
        }
        if (end <= start) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Slutdatumet för försäljningen måste infalla efter startdatumet.");
        }
        if (end <= now) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Slutdatumet för försäljningen måste sättas till ett framtida datum.");
        }

        const [sY, sM, sD] = parseCalendarDate(payload.startDate);
        const [eY, eM, eD] = parseCalendarDate(payload.endDate);

        const startUtc = Date.UTC(sY, sM, sD);
        const endUtc = Date.UTC(eY, eM, eD);
        const diffInCalendarDays = Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24));

        console.log(`📌 [Campaign Duration Check] Start: ${sY}-${sM+1}-${sD}, End: ${eY}-${eM+1}-${eD}, Calendar Days: ${diffInCalendarDays}`);

        if (diffInCalendarDays > 21) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Försäljningens varaktighet får inte överskrida 3 veckor (21 dagar). Vänligen justera ditt slutdatum.");
        }
    } else if (payload.endDate) {
        const end = new Date(payload.endDate);
        if (isNaN(end.getTime()) || end <= now) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Vänligen välj ett giltigt framtida datum för försäljningens slutdatum.");
        }

        const [tY, tM, tD] = parseCalendarDate(now);
        const [eY, eM, eD] = parseCalendarDate(payload.endDate);

        const todayUtc = Date.UTC(tY, tM, tD);
        const endUtc = Date.UTC(eY, eM, eD);
        const diffInCalendarDays = Math.round((endUtc - todayUtc) / (1000 * 60 * 60 * 24));

        console.log(`📌 [Campaign Duration Check (from today)] Today: ${tY}-${tM+1}-${tD}, End: ${eY}-${eM+1}-${eD}, Calendar Days: ${diffInCalendarDays}`);

        if (diffInCalendarDays > 21) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Försäljningens varaktighet får inte överskrida 3 veckor (21 dagar). Vänligen justera ditt slutdatum.");
        }
    }

    // Check user approval status
    const user = await UserModel.findById(userId);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "Användarkontot hittades inte.");

    if (user.role === "ADMIN" && !user.isApproved) {
        throw new ApiError(httpStatus.FORBIDDEN, "Ditt adminkonto väntar på godkännande. Du kommer att kunna starta försäljningar när ditt konto har verifierats.");
    }

    // Check if group exists and is active
    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Gruppen som angavs för denna försäljning kunde inte hittas.");

    if (!group.isActive) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Försäljningar kan endast startas för aktiva grupper.");
    }

    // Destructure transient boolean and array flags from payload (do not store in DB)
    const { addAllGroupSellers, sellerIds, ...campaignDataPayload } = payload;

    // Create the campaign
    const campaignData: any = {
        ...campaignDataPayload,
        status: payload.status || "ACTIVE",
        groupId: new Types.ObjectId(groupId),
        createdBy: new Types.ObjectId(userId),
    };
    if (payload.tierId) {
        campaignData.tierAssignDate = new Date();
    }
    const campaign = await CampaignModel.create(campaignData);

    // If addAllGroupSellers boolean flag is true, add all existing group sellers to this campaign
    let sellersToAdd: string[] = [];
    if (addAllGroupSellers) {
        const { SellerGroupModel } = await import("../sellerGroup/sellerGroup.model");
        const groupSellers = await SellerGroupModel.find({
            groupId: new Types.ObjectId(groupId),
            isDeleted: false,
        })
            .select("sellerId")
            .lean();

        sellersToAdd = groupSellers.map((gs) => gs.sellerId.toString());
    } else if (sellerIds && (Array.isArray(sellerIds) ? sellerIds.length > 0 : Boolean(sellerIds))) {
        sellersToAdd = Array.isArray(sellerIds) ? sellerIds : [sellerIds];
    }

    if (sellersToAdd.length > 0) {
        try {
            const { campaignSellerServices } = await import("../campaignSeller/campaignSeller.services");
            await campaignSellerServices.addSellersToCampaign(campaign._id.toString(), sellersToAdd);
        } catch (sellerError) {
            console.error("Failed to add sellers to created campaign:", sellerError);
        }
    }

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
    const tiers = await TierModel.find({ isActive: true, isDeleted: false }).sort({ minSalesVolume: 1 });

    const campaignsWithStats = await Promise.all(
        campaigns.map(async (campaign: any) => {
            const stats = await getCampaignStats(campaign._id as Types.ObjectId);
            const totalPackagesSold = stats.totalPackagesSold;

            let currentTier = null;
            if (campaign.tierId) {
                currentTier = tiers.find((t) => t._id.toString() === campaign.tierId.toString()) || null;
            }
            if (!currentTier) {
                currentTier = tiers.find((t) => totalPackagesSold >= t.minSalesVolume && (t.maxSalesVolume === undefined || t.maxSalesVolume === null || totalPackagesSold <= t.maxSalesVolume)) || null;
            }

            const currentMinVol = currentTier?.minSalesVolume ?? -1;
            const nextTier = tiers.find((t) => t.minSalesVolume > (currentMinVol >= 0 ? currentMinVol : totalPackagesSold)) || null;
            const packagesNeededForNextTier = nextTier ? Math.max(0, nextTier.minSalesVolume - totalPackagesSold) : 0;

            const formatTier = (t: any) =>
                t
                    ? {
                          _id: t._id,
                          name: t.name,
                          percentage: t.percentage,
                          minSalesVolume: t.minSalesVolume,
                          maxSalesVolume: t.maxSalesVolume,
                      }
                    : null;

            const sellersCount = await CampaignSellerModel.countDocuments({
                campaignId: campaign._id,
                isDeleted: false,
            });

            return {
                ...campaign,
                sellersCount,
                totalPackagesSold,
                totalRevenueSold: stats.totalRevenueSold * ((currentTier?.percentage || 0) / 100),
                currentTier: formatTier(currentTier),
                nextTier: formatTier(nextTier),
                packagesNeededForNextTier,
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

const getAllCampaignsSummary = async (query: any = {}) => {
    const filter: any = { isDeleted: false };
    if (query.status) filter.status = query.status;

    const searchTerm = query.search || query.searchTerm;
    if (searchTerm) {
        filter.$or = [{ name: { $regex: searchTerm, $options: "i" } }, { code: { $regex: searchTerm, $options: "i" } }];
    }

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const campaigns = await CampaignModel.find(filter).populate("tierId").populate("createdBy", "name email role phone photo").sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    const total = await CampaignModel.countDocuments(filter);

    const summaryData = await Promise.all(
        campaigns.map(async (campaign: any) => {
            const membersCount = await CampaignSellerModel.countDocuments({
                campaignId: campaign._id,
                isDeleted: false,
            });

            return {
                _id: campaign._id,
                name: campaign.name,
                status: campaign.status,
                membersCount,
                tier: campaign.tierId || null,
                tierAssignDate: campaign.tierAssignDate || null,
                code: campaign.code,
                target: campaign.target,
                endDate: campaign.endDate,
                createdAt: campaign.createdAt,
            };
        }),
    );

    return {
        data: summaryData,
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
    // Run expiry check to ensure any campaigns whose endDate passed are moved to FULFILMENT
    try {
        const { runExpiryCheck } = await import("./campaign.jobs");
        await runExpiryCheck();
    } catch (err) {
        console.error("Error executing runExpiryCheck inside getActiveCampaigns:", err);
    }

    const campaigns = await CampaignModel.find({ status: "ACTIVE", isDeleted: false }).sort({ endDate: 1, createdAt: -1 });
    return campaigns;
};

const getCampaignById = async (campaignId: string) => {
    const campaign = await CampaignModel.findOne({ _id: campaignId, isDeleted: false }).lean();
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Begärd försäljning hittades inte eller har raderats.");

    const stats = await getCampaignStats(campaign._id as Types.ObjectId);
    const totalPackagesSold = stats.totalPackagesSold;

    // Fetch simple Campaign Admin info
    let campaignAdmin = null;
    if (campaign.createdBy) {
        campaignAdmin = await UserModel.findOne({ _id: campaign.createdBy, isDeleted: false }, { name: 1, email: 1, phone: 1, role: 1, profession: 1 }).lean();
    }

    // Calculate Tiers
    const tiers = await TierModel.find({ isActive: true, isDeleted: false }).sort({ minSalesVolume: 1 });
    const formatTier = (t: any) =>
        t
            ? {
                  _id: t._id,
                  name: t.name,
                  percentage: t.percentage,
                  minSalesVolume: t.minSalesVolume,
                  maxSalesVolume: t.maxSalesVolume,
              }
            : null;

    let currentTier = null;
    if (campaign.tierId) {
        currentTier = tiers.find((t) => t._id.toString() === campaign.tierId?.toString()) || null;
    }
    if (!currentTier) {
        currentTier = tiers.find((t) => totalPackagesSold >= t.minSalesVolume && (t.maxSalesVolume === undefined || t.maxSalesVolume === null || totalPackagesSold <= t.maxSalesVolume)) || null;
    }

    const currentMinVol = currentTier?.minSalesVolume ?? -1;
    const nextTier = tiers.find((t) => t.minSalesVolume > (currentMinVol >= 0 ? currentMinVol : totalPackagesSold)) || null;
    const packagesNeededForNextTier = nextTier ? Math.max(0, nextTier.minSalesVolume - totalPackagesSold) : 0;

    return {
        ...campaign,
        totalPackagesSold,
        totalRevenueSold: stats.totalRevenueSold * ((currentTier?.percentage || 0) / 100),
        totalSoldAmount: stats.totalRevenueSold,
        campaignAdmin,
        currentTier: formatTier(currentTier),
        nextTier: formatTier(nextTier),
        packagesNeededForNextTier,
    };
};

const getCampaignByCode = async (code: string) => {
    const campaign = await CampaignModel.findOne({ code, isDeleted: false }).lean();
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, `Försäljning med koden "${code}" hittades inte eller har raderats.`);

    const stats = await getCampaignStats(campaign._id as Types.ObjectId);
    const tiers = await TierModel.find({ isActive: true, isDeleted: false }).sort({ minSalesVolume: 1 });
    let currentTier = null;
    if (campaign.tierId) {
        currentTier = tiers.find((t) => t._id.toString() === campaign.tierId?.toString()) || null;
    }
    if (!currentTier) {
        currentTier = tiers.find((t) => stats.totalPackagesSold >= t.minSalesVolume && (t.maxSalesVolume === undefined || t.maxSalesVolume === null || stats.totalPackagesSold <= t.maxSalesVolume)) || null;
    }

    return {
        ...campaign,
        totalPackagesSold: stats.totalPackagesSold,
        totalRevenueSold: stats.totalRevenueSold * ((currentTier?.percentage || 0) / 100),
    };
};

const getCampaignsByGroup = async (groupId: string, query: any = {}) => {
    const filter: any = { groupId, isDeleted: false };
    if (query.status) filter.status = query.status;

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const campaigns = await CampaignModel.find(filter).populate("createdBy", "name email role phone photo").sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    const total = await CampaignModel.countDocuments(filter);
    const tiers = await TierModel.find({ isActive: true, isDeleted: false }).sort({ minSalesVolume: 1 });

    const formatTier = (t: any) =>
        t
            ? {
                  _id: t._id,
                  name: t.name,
                  percentage: t.percentage,
                  minSalesVolume: t.minSalesVolume,
                  maxSalesVolume: t.maxSalesVolume,
              }
            : null;

    const campaignsWithDetails = await Promise.all(
        campaigns.map(async (campaign: any) => {
            const stats = await getCampaignStats(campaign._id as Types.ObjectId);
            const totalPackagesSold = stats.totalPackagesSold;

            let currentTier = null;
            if (campaign.tierId) {
                currentTier = tiers.find((t) => t._id.toString() === campaign.tierId.toString()) || null;
            }
            if (!currentTier) {
                currentTier = tiers.find((t) => totalPackagesSold >= t.minSalesVolume && (t.maxSalesVolume === undefined || t.maxSalesVolume === null || totalPackagesSold <= t.maxSalesVolume)) || null;
            }

            const currentMinVol = currentTier?.minSalesVolume ?? -1;
            const nextTier = tiers.find((t) => t.minSalesVolume > (currentMinVol >= 0 ? currentMinVol : totalPackagesSold)) || null;
            const packagesNeededForNextTier = nextTier ? Math.max(0, nextTier.minSalesVolume - totalPackagesSold) : 0;

            const sellersCount = await CampaignSellerModel.countDocuments({
                campaignId: campaign._id,
                isDeleted: false,
            });

            return {
                ...campaign,
                sellersCount,
                totalPackagesSold,
                totalRevenueSold: stats.totalRevenueSold * ((currentTier?.percentage || 0) / 100),
                currentTier: formatTier(currentTier),
                nextTier: formatTier(nextTier),
                packagesNeededForNextTier,
            };
        }),
    );

    return {
        data: campaignsWithDetails,
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
            throw new ApiError(httpStatus.BAD_REQUEST, "Ogiltigt format för start- eller slutdatum.");
        }
        if (end <= start) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Försäljningens slutdatum måste infalla efter startdatumet.");
        }
        if (end <= new Date()) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Försäljningens slutdatum måste vara i framtiden.");
        }
    } else if (payload.endDate) {
        const end = new Date(payload.endDate);
        if (isNaN(end.getTime()) || end <= new Date()) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Försäljningens slutdatum måste vara ett giltigt framtida datum.");
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
    if (payload.tierId) {
        updateData.tierAssignDate = new Date();
    }

    const campaign = await CampaignModel.findOneAndUpdate({ _id: campaignId, isDeleted: false }, { $set: updateData }, { returnDocument: "after", runValidators: true });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Begärd försäljning hittades inte eller har raderats.");
    return campaign;
};

const updateCampaignStatus = async (campaignId: string, status: "DRAFT" | "ACTIVE" | "FULFILMENT" | "COMPLETED") => {
    const validStatuses = ["DRAFT", "ACTIVE", "FULFILMENT", "COMPLETED"];
    if (!validStatuses.includes(status)) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Ogiltig försäljningsstatus "${status}". Tillåtna värden: ${validStatuses.join(", ")}`);
    }

    const campaign = await CampaignModel.findOne({ _id: campaignId, isDeleted: false });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Begärd försäljning hittades inte eller har raderats.");

    campaign.status = status;
    await campaign.save();
    return campaign;
};

const deleteCampaign = async (campaignId: string) => {
    const campaign = await CampaignModel.findOneAndUpdate({ _id: campaignId, isDeleted: false }, { $set: { isDeleted: true } }, { returnDocument: "after" });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Begärd försäljning hittades inte eller har redan raderats.");

    return campaign;
};

const assignTierToCampaign = async (campaignId: string, tierId: string) => {
    const campaign = await CampaignModel.findOne({ _id: campaignId, isDeleted: false });
    if (!campaign) throw new ApiError(httpStatus.NOT_FOUND, "Begärd försäljning hittades inte eller har raderats.");

    const tier = await TierModel.findOne({ _id: tierId, isDeleted: false });
    if (!tier) throw new ApiError(httpStatus.NOT_FOUND, "Begärd nivå hittades inte eller har raderats.");

    campaign.tierId = new Types.ObjectId(tierId);
    campaign.tierAssignDate = new Date();
    await campaign.save();

    return campaign;
};

const getRunningCampaignByGroup = async (groupId: string) => {
    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Tillhörande grupp hittades inte eller har raderats.");

    const campaign = await CampaignModel.findOne({ groupId: group._id, isDeleted: false, status: "ACTIVE" }).lean();
    if (!campaign) return null;

    const stats = await getCampaignStats(campaign._id as Types.ObjectId);
    const tiers = await TierModel.find({ isActive: true, isDeleted: false }).sort({ minSalesVolume: 1 });

    let currentTier = null;
    if (campaign.tierId) {
        currentTier = tiers.find((t) => t._id.toString() === campaign.tierId?.toString()) || null;
    }
    if (!currentTier) {
        currentTier = tiers.find((t) => stats.totalPackagesSold >= t.minSalesVolume && (t.maxSalesVolume === undefined || t.maxSalesVolume === null || stats.totalPackagesSold <= t.maxSalesVolume)) || null;
    }

    return {
        ...campaign,
        totalPackagesSold: stats.totalPackagesSold,
        totalRevenueSold: stats.totalRevenueSold * ((currentTier?.percentage || 0) / 100),
    };
};

const getRunningCampaignForSeller = async (sellerId: string, groupId: string, query: any = {}) => {
    // 1. Get campaign IDs that this seller has explicitly joined from CampaignSellerModel
    const sellerCampaignJoins = await CampaignSellerModel.find({
        sellerId: new Types.ObjectId(sellerId),
        isDeleted: false,
    })
        .select("campaignId")
        .lean();

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

    // 2. Build filter matching group ID, joined campaign IDs, and optional status
    const filter: any = {
        _id: { $in: joinedCampaignIds },
        isDeleted: false,
    };

    if (groupId && Types.ObjectId.isValid(groupId)) {
        filter.groupId = new Types.ObjectId(groupId);
    }

    if (query.status) {
        filter.status = query.status;
    }

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const campaigns = await CampaignModel.find(filter).populate("createdBy", "name email role phone photo").sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    const total = await CampaignModel.countDocuments(filter);
    const tiers = await TierModel.find({ isActive: true, isDeleted: false }).sort({ minSalesVolume: 1 });

    const campaignsWithStats = await Promise.all(
        campaigns.map(async (campaign) => {
            const stats = await getCampaignStats(campaign._id as Types.ObjectId);
            let currentTier = null;
            if (campaign.tierId) {
                currentTier = tiers.find((t) => t._id.toString() === (campaign as any).tierId?.toString()) || null;
            }
            if (!currentTier) {
                currentTier = tiers.find((t) => stats.totalPackagesSold >= t.minSalesVolume && (t.maxSalesVolume === undefined || t.maxSalesVolume === null || stats.totalPackagesSold <= t.maxSalesVolume)) || null;
            }
            const formatTier = (tierObj: any) =>
                tierObj
                    ? {
                          _id: tierObj._id,
                          name: tierObj.name,
                          percentage: tierObj.percentage,
                          minSalesVolume: tierObj.minSalesVolume,
                          maxSalesVolume: tierObj.maxSalesVolume,
                      }
                    : null;

            const currentMinVol = currentTier?.minSalesVolume ?? -1;
            const nextTier = tiers.find((t) => t.minSalesVolume > (currentMinVol >= 0 ? currentMinVol : stats.totalPackagesSold)) || null;
            const packagesNeededForNextTier = nextTier ? Math.max(0, nextTier.minSalesVolume - stats.totalPackagesSold) : 0;

            return {
                ...campaign,
                totalPackagesSold: stats.totalPackagesSold,
                totalRevenueSold: stats.totalRevenueSold * ((currentTier?.percentage || 0) / 100),
                currentTier: formatTier(currentTier),
                nextTier: formatTier(nextTier),
                packagesNeededForNextTier,
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

const getMyCampaigns = async (user: any, query: any = {}) => {
    const filter: any = {
        createdBy: new Types.ObjectId(user._id),
        isDeleted: false,
    };

    if (query.status) filter.status = query.status;
    if (query.groupId) filter.groupId = new Types.ObjectId(query.groupId);

    const searchTerm = query.search || query.searchTerm;
    if (searchTerm) {
        filter.$and = [
            { $or: [{ name: { $regex: searchTerm, $options: "i" } }, { code: { $regex: searchTerm, $options: "i" } }] },
        ];
    }

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const campaigns = await CampaignModel.find(filter)
        .select("_id name shortDescription status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

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

export const campaignServices = {
    createCampaign,
    getAllCampaigns,
    getMyCampaigns,
    getAllCampaignsWithStats,
    getAllCampaignsSummary,
    getActiveCampaigns,
    getCampaignById,
    getCampaignByCode,
    getCampaignsByGroup,
    getRunningCampaignByGroup,
    getRunningCampaignForSeller,
    assignTierToCampaign,
    updateCampaign,
    updateCampaignStatus,
    deleteCampaign,
};
