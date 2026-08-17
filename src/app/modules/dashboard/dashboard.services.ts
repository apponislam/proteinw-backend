import { UserModel } from "../auth/auth.model";
import { GroupModel } from "../group/group.model";
import { CampaignModel } from "../campaign/campaign.model";
import { OrderModel } from "../order/order.model";
import { ProductModel } from "../product/product.model";
import { CampaignProductModel } from "../campaignProduct/campaignProduct.model";
import { TierModel } from "../tier/tier.model";
import { SellerGroupModel } from "../sellerGroup/sellerGroup.model";
import { CampaignSellerModel } from "../campaignSeller/campaignSeller.model";
import config from "../../config";
import { Types } from "mongoose";

const getDashboardStats = async () => {
    const ordersResult = await OrderModel.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: null, totalPackages: { $sum: "$totalPackage" } } },
    ]);
    const totalPackagesSold = ordersResult.length > 0 ? ordersResult[0].totalPackages : 0;

    const now = new Date();
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currentMonthOrders = await OrderModel.aggregate([
        { $match: { isDeleted: false, createdAt: { $gte: firstDayOfCurrentMonth } } },
        { $group: { _id: null, totalPackages: { $sum: "$totalPackage" } } },
    ]);
    const currentMonthPackages = currentMonthOrders.length > 0 ? currentMonthOrders[0].totalPackages : 0;

    const previousMonthOrders = await OrderModel.aggregate([
        { $match: { isDeleted: false, createdAt: { $gte: firstDayOfPreviousMonth, $lt: firstDayOfCurrentMonth } } },
        { $group: { _id: null, totalPackages: { $sum: "$totalPackage" } } },
    ]);
    const previousMonthPackages = previousMonthOrders.length > 0 ? previousMonthOrders[0].totalPackages : 0;

    let packageGrowth = 0;
    if (previousMonthPackages === 0) {
        if (currentMonthPackages > 0) packageGrowth = 100;
    } else {
        packageGrowth = ((currentMonthPackages - previousMonthPackages) / previousMonthPackages) * 100;
    }
    packageGrowth = parseFloat(packageGrowth.toFixed(1));

    const topCategoryAgg = await OrderModel.aggregate([
        { $match: { isDeleted: false } },
        { $unwind: "$items" },
        {
            $lookup: {
                from: "products",
                localField: "items.productId",
                foreignField: "_id",
                as: "product",
            },
        },
        { $unwind: "$product" },
        {
            $group: {
                _id: "$product.category",
                count: { $sum: "$items.quantity" },
            },
        },
        { $sort: { count: -1 } },
        { $limit: 1 },
    ]);
    const topCategory = topCategoryAgg.length > 0 ? topCategoryAgg[0]._id : "N/A";

    const totalAdmins = await UserModel.countDocuments({ role: "ADMIN", isDeleted: false });
    const totalSellers = await UserModel.countDocuments({ role: "SELLER", isDeleted: false });
    const totalGroups = await GroupModel.countDocuments({ isDeleted: false });
    const activeCampaigns = await CampaignModel.countDocuments({
        isDeleted: false,
        $or: [{ status: "ACTIVE" }, { endDate: { $gt: new Date() } }],
    });
    const totalOrders = await OrderModel.countDocuments({ isDeleted: false });

    return {
        totalPackagesSold,
        packageGrowth,
        topCategory,
        totalAdmins,
        totalSellers,
        totalGroups,
        activeCampaigns,
        totalOrders,
    };
};

const getDashboardStatus = async (userId: string) => {
    const group = await GroupModel.findOne({ createdBy: userId, isDeleted: false });
    
    if (!group) {
        return {
            hasGroup: false,
            hasCampaign: false,
        };
    }

    const campaign = await CampaignModel.findOne({ groupId: group._id, isDeleted: false });

    return {
        hasGroup: true,
        hasCampaign: !!campaign,
    };
};

const getStoreInfo = async (campaignCode: string, referralCode: string) => {
    // 1. Find the campaign by code and status ACTIVE
    const campaign = await CampaignModel.findOne({ code: campaignCode, status: "ACTIVE", isDeleted: false });
    if (!campaign) {
        return { validation: false };
    }

    // 2. Find the member by referralCode
    const member = await UserModel.findOne({ referralCode, isActive: true, isDeleted: false });
    if (!member) {
        return { validation: false };
    }

    // 3. Validate member association with campaign or group
    const isCampaignSeller = await CampaignSellerModel.exists({ sellerId: member._id, campaignId: campaign._id, isDeleted: false });
    const isSellerGroup = campaign.groupId
        ? await SellerGroupModel.exists({ sellerId: member._id, groupId: campaign.groupId, isDeleted: false })
        : false;

    if (!isCampaignSeller && !isSellerGroup) {
        return { validation: false };
    }

    // 4. Get the group (if linked to campaign)
    let group = null;
    let adminName = "";
    if (campaign.groupId) {
        group = await GroupModel.findOne({ _id: campaign.groupId, isDeleted: false });
        if (group) {
            const admin = await UserModel.findOne({ _id: group.createdBy, isDeleted: false });
            adminName = admin ? admin.name : "";
        }
    } else if (campaign.createdBy) {
        const admin = await UserModel.findOne({ _id: campaign.createdBy, isDeleted: false });
        adminName = admin ? admin.name : "";
    }

    // 5. Get total count of products in this campaign
    const totalProducts = await CampaignProductModel.countDocuments({
        campaignId: campaign._id,
        isDeleted: false,
    });

    return {
        validation: true,
        adminName,
        groupName: group ? group.name : campaign.name,
        campaignName: campaign.name,
        campaignProductCount: totalProducts,
    };
};

const getSellerDashboardStats = async (groupId: string | undefined, userId?: string, role?: string) => {
    if (!groupId) {
        return {
            totalSales: 0,
            totalProfit: 0,
            packagesSold: 0,
            daysRemaining: 0,
            goal: 0,
            groupName: "",
            shortDescription: "",
        };
    }

    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) {
        return {
            totalSales: 0,
            totalProfit: 0,
            packagesSold: 0,
            daysRemaining: 0,
            goal: 0,
            groupName: "",
            shortDescription: "",
        };
    }

    const campaign = await CampaignModel.findOne({ groupId: group._id, isDeleted: false });
    if (!campaign) {
        return {
            totalSales: 0,
            totalProfit: 0,
            packagesSold: 0,
            daysRemaining: 0,
            goal: 0,
            groupName: group.name,
            shortDescription: group.shortDescription,
        };
    }

    const matchStage: any = {
        campaignId: campaign._id,
        status: { $ne: "cancelled" },
        isDeleted: false,
    };

    const ordersStats = await OrderModel.aggregate([
        {
            $match: matchStage,
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$totalPrice" },
                totalPackagesSold: { $sum: "$totalPackage" },
            },
        },
    ]);

    const totalSales = ordersStats[0]?.totalRevenue || 0;
    const packagesSold = ordersStats[0]?.totalPackagesSold || 0;

    const tiers = await TierModel.find({ isActive: true, isDeleted: false }).sort({ minSalesVolume: 1 });
    const currentTier = tiers.find(t => 
        packagesSold >= t.minSalesVolume && 
        (t.maxSalesVolume === undefined || t.maxSalesVolume === null || packagesSold <= t.maxSalesVolume)
    );
    const profitPercentage = currentTier ? currentTier.percentage : 40;
    const totalProfit = totalSales * (profitPercentage / 100);

    const daysRemaining = Math.max(0, Math.ceil((new Date(campaign.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

    const goal = campaign.target || 0;

    return {
        totalSales,
        totalProfit,
        packagesSold,
        daysRemaining,
        goal,
        groupName: group.name,
        shortDescription: group.shortDescription,
    };
};

const getSuperAdminSellersStats = async () => {
    const totalSellers = await UserModel.countDocuments({ role: "SELLER", isDeleted: false });
    const activeGroups = await GroupModel.countDocuments({ isActive: true, isDeleted: false });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const mtdOrdersCount = await OrderModel.countDocuments({
        isDeleted: false,
        status: { $ne: "cancelled" },
        createdAt: { $gte: startOfMonth },
    });

    const revenueResult = await OrderModel.aggregate([
        {
            $match: {
                isDeleted: false,
                status: { $ne: "cancelled" },
            },
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$totalPrice" },
            },
        },
    ]);
    const salesRevenue = revenueResult[0]?.totalRevenue || 0;

    return {
        totalSellers,
        activeGroups,
        mtdOrders: mtdOrdersCount,
        salesRevenue,
    };
};

const getSuperAdminSellers = async (query: any) => {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const total = await UserModel.countDocuments({ role: "SELLER", isDeleted: false });

    const sellers = await UserModel.find({ role: "SELLER", isDeleted: false })
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const sellersWithStats = await Promise.all(
        sellers.map(async (seller) => {
            const ordersCount = await OrderModel.countDocuments({
                memberId: seller._id,
                isDeleted: false,
            });

            const packagesAgg = await OrderModel.aggregate([
                {
                    $match: {
                        memberId: seller._id,
                        isDeleted: false,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalPackages: { $sum: "$totalPackage" },
                    },
                },
            ]);
            const packagesCount = packagesAgg[0]?.totalPackages || 0;

            const sellerGroupJoin = await SellerGroupModel.findOne({ sellerId: seller._id, isDeleted: false }).populate("groupId");
            const group = sellerGroupJoin?.groupId as any;

            let campaign = null;
            if (group) {
                campaign = await CampaignModel.findOne({ groupId: group._id, isDeleted: false, status: "ACTIVE" });
            }

            const baseUrl = config.client_url || "http://localhost:3000";
            const salesLink = campaign?.code
                ? `${baseUrl}/store?campaign=${campaign.code}&referral=${seller.referralCode}`
                : "N/A";

            const nameParts = (seller.name || "").trim().split(/\s+/);
            const code = nameParts.length > 1
                ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                : (nameParts[0]?.[0] || "").toUpperCase();

            return {
                _id: seller._id,
                name: seller.name,
                email: seller.email,
                group: group?.name || "N/A",
                orders: ordersCount,
                packages: packagesCount,
                status: seller.isActive ? "Active" : "Inactive",
                salesLink,
                code,
                groupDetails: group ? {
                    _id: group._id,
                    name: group.name,
                    code: group.code,
                    goal: group.goal,
                    endDate: group.endDate,
                } : null,
                campaignDetails: campaign ? {
                    _id: campaign._id,
                    name: campaign.name,
                    code: campaign.code,
                    target: campaign.target,
                    endDate: campaign.endDate,
                } : null,
            };
        })
    );

    return {
        data: sellersWithStats,
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

const getSuperAdminGroupsStats = async (query: any) => {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || "createdAt";

    const groups = await GroupModel.find({ isDeleted: false })
        .populate({
            path: "createdBy",
            select: "name email phone photo role",
        });

    const tiers = await TierModel.find({ isActive: true, isDeleted: false }).sort({ minSalesVolume: 1 });

    const groupsStats = await Promise.all(
        groups.map(async (group) => {
            const activeCampaignDocs = await CampaignModel.find({
                groupId: group._id,
                isDeleted: false,
                status: "ACTIVE",
            }).select("_id").lean();

            const activeCampaignsCount = activeCampaignDocs.length;
            const activeCampaignIds = activeCampaignDocs.map((c) => c._id);
            const campaignAdmin = group.createdBy as any;

            const sellersCount = await SellerGroupModel.countDocuments({
                groupId: group._id,
                isDeleted: false,
            });

            let unitsSold = 0;
            let revenue = 0;
            let profitPercentage = 40;

            if (activeCampaignIds.length > 0) {
                const ordersStats = await OrderModel.aggregate([
                    {
                        $match: {
                            campaignId: { $in: activeCampaignIds },
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

                unitsSold = ordersStats[0]?.totalPackagesSold || 0;
                revenue = ordersStats[0]?.totalRevenue || 0;

                const currentTier = tiers.find(t => 
                    unitsSold >= t.minSalesVolume && 
                    (t.maxSalesVolume === undefined || t.maxSalesVolume === null || unitsSold <= t.maxSalesVolume)
                );
                profitPercentage = currentTier ? currentTier.percentage : 40;
            }

            const groupProfit = revenue * (profitPercentage / 100);

            const nameParts = (group.name || "").trim().split(/\s+/);
            const groupCode = nameParts.length > 1
                ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                : (nameParts[0]?.[0] || "").toUpperCase();

            return {
                _id: group._id,
                groupCode,
                groupName: group.name,
                assignedAdmin: campaignAdmin ? {
                    _id: campaignAdmin._id,
                    name: campaignAdmin.name,
                    email: campaignAdmin.email,
                    phone: campaignAdmin.phone,
                    photo: campaignAdmin.photo,
                } : null,
                sellers: sellersCount,
                activeCampaigns: activeCampaignsCount,
                packagesSold: unitsSold,
                revenue,
                groupProfit,
                status: group.isActive,
                createdAt: group.createdAt,
            };
        })
    );

    // Sort groupsStats based on sortBy parameter
    if (sortBy === "packagesSold") {
        groupsStats.sort((a, b) => b.packagesSold - a.packagesSold);
    } else if (sortBy === "revenue") {
        groupsStats.sort((a, b) => b.revenue - a.revenue);
    } else if (sortBy === "groupProfit") {
        groupsStats.sort((a, b) => b.groupProfit - a.groupProfit);
    } else {
        // default to createdAt descending
        groupsStats.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    const paginatedData = groupsStats.slice(skip, skip + limit);

    return {
        data: paginatedData,
        pagination: {
            page,
            limit,
            total: groupsStats.length,
            totalPages: Math.ceil(groupsStats.length / limit),
            hasNext: page < Math.ceil(groupsStats.length / limit),
            hasPrev: page > 1,
        },
    };
};

const getSuperAdminGroupsDashboardCards = async () => {
    // 1. ACTIVE GROUPS
    const activeGroupsCount = await GroupModel.countDocuments({ isActive: true, isDeleted: false });

    // Find all ACTIVE campaigns
    const activeCampaignDocs = await CampaignModel.find({
        status: "ACTIVE",
        isDeleted: false,
    }).lean();

    const activeCampaignIds = activeCampaignDocs.map((c) => c._id);

    // 2. PACKAGES SOLD (only for ACTIVE campaigns)
    let packagesSold = 0;
    if (activeCampaignIds.length > 0) {
        const ordersStats = await OrderModel.aggregate([
            {
                $match: {
                    campaignId: { $in: activeCampaignIds },
                    status: { $ne: "cancelled" },
                    isDeleted: false,
                },
            },
            {
                $group: {
                    _id: null,
                    totalPackages: { $sum: "$totalPackage" },
                },
            },
        ]);
        packagesSold = ordersStats[0]?.totalPackages || 0;
    }

    // 3. AVG. PROFIT TIER (Closest matching tier percentage from active tiers)
    const tiers = await TierModel.find({ isActive: true, isDeleted: false }).sort({ minSalesVolume: 1 });

    let totalPercentage = 0;

    for (const campaign of activeCampaignDocs) {
        let profitPercentage = 40;

        if (campaign.tierId) {
            const assignedTier = tiers.find((t) => t._id.toString() === campaign.tierId?.toString());
            if (assignedTier) {
                profitPercentage = assignedTier.percentage;
            }
        }
        
        if (!campaign.tierId) {
            const campaignOrders = await OrderModel.aggregate([
                {
                    $match: {
                        campaignId: campaign._id,
                        status: { $ne: "cancelled" },
                        isDeleted: false,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalPackages: { $sum: "$totalPackage" },
                    },
                },
            ]);
            const campaignPackages = campaignOrders[0]?.totalPackages || 0;
            const currentTier = tiers.find(t => 
                campaignPackages >= t.minSalesVolume && 
                (t.maxSalesVolume === undefined || t.maxSalesVolume === null || campaignPackages <= t.maxSalesVolume)
            );
            if (currentTier) profitPercentage = currentTier.percentage;
        }

        totalPercentage += profitPercentage;
    }

    const rawAvg = activeCampaignDocs.length > 0 ? totalPercentage / activeCampaignDocs.length : 40;

    // Pick the closest actual tier percentage from your DB tiers (e.g. 40, 45, 50)
    let closestTierPercentage = 40;
    if (tiers.length > 0) {
        let minDiff = Infinity;
        for (const t of tiers) {
            const diff = Math.abs(t.percentage - rawAvg);
            if (diff < minDiff) {
                minDiff = diff;
                closestTierPercentage = t.percentage;
            }
        }
    }

    const avgProfitTier = closestTierPercentage;

    // 4. DEADLINES THIS WEEK (ACTIVE campaigns ending within next 7 days)
    const now = new Date();
    const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const deadlinesThisWeek = await CampaignModel.countDocuments({
        status: "ACTIVE",
        isDeleted: false,
        endDate: {
            $gte: now,
            $lte: endOfWeek,
        },
    });

    return {
        activeGroups: activeGroupsCount,
        packagesSold,
        avgProfitTier,
        deadlinesThisWeek,
    };
};

const getSuperAdminAdminsStats = async () => {
    // 1. Total Admins
    const totalAdmins = await UserModel.countDocuments({ role: "ADMIN", isDeleted: false });

    // 2. Approved Admins
    const approvedAdmins = await UserModel.countDocuments({ role: "ADMIN", isApproved: true, isDeleted: false });

    // 3. Not Approved Admins
    const unapprovedAdmins = await UserModel.countDocuments({ role: "ADMIN", isApproved: { $ne: true }, isDeleted: false });

    // 4. Admins with no group assigned / created
    // Find IDs of admins who have created a group
    const adminsWithGroup = await GroupModel.distinct("createdBy", { isDeleted: false });
    
    // Count admins whose _id is not in adminsWithGroup
    const unassignedGroupAdmins = await UserModel.countDocuments({
        role: "ADMIN",
        isDeleted: false,
        _id: { $nin: adminsWithGroup },
    });

    return {
        totalAdmins,
        approvedAdmins,
        unapprovedAdmins,
        unassignedGroupAdmins,
    };
};

const getTotalDistributedProfit = async () => {
    const allNonDeletedCampaigns = await CampaignModel.find({ isDeleted: false }).populate("tierId").lean();
    const allTiers = await TierModel.find({ isActive: true, isDeleted: false }).sort({ minSalesVolume: 1 });

    let totalDistributedProfit = 0;

    for (const campaign of allNonDeletedCampaigns) {
        const stats = await OrderModel.aggregate([
            {
                $match: {
                    campaignId: new Types.ObjectId(campaign._id),
                    status: { $ne: "cancelled" },
                    isDeleted: false,
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalPrice" },
                    totalPackages: { $sum: "$totalPackage" },
                },
            },
        ]);

        const revenue = stats[0]?.totalRevenue || 0;
        const packages = stats[0]?.totalPackages || 0;

        let profitPercentage = 40;
        if (campaign.tierId && typeof campaign.tierId === "object" && (campaign.tierId as any).percentage) {
            profitPercentage = (campaign.tierId as any).percentage;
        } else {
            const matchedTier = allTiers.find(t =>
                packages >= t.minSalesVolume &&
                (t.maxSalesVolume === undefined || t.maxSalesVolume === null || packages <= t.maxSalesVolume)
            );
            if (matchedTier) {
                profitPercentage = matchedTier.percentage;
            }
        }

        totalDistributedProfit += revenue * (profitPercentage / 100);
    }

    return {
        totalDistributedProfit,
    };
};

export const dashboardServices = {
    getDashboardStats,
    getDashboardStatus,
    getStoreInfo,
    getSellerDashboardStats,
    getSuperAdminSellersStats,
    getSuperAdminSellers,
    getSuperAdminGroupsStats,
    getSuperAdminGroupsDashboardCards,
    getSuperAdminAdminsStats,
    getTotalDistributedProfit,
};
