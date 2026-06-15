import { UserModel } from "../auth/auth.model";
import { GroupModel } from "../group/group.model";
import { CampaignModel } from "../campaign/campaign.model";
import { OrderModel } from "../order/order.model";
import { ProductModel } from "../product/product.model";
import { CampaignProductModel } from "../campaignProduct/campaignProduct.model";
import { TierModel } from "../tier/tier.model";

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
    const activeCampaigns = await CampaignModel.countDocuments({ isActive: true, isDeleted: false });
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
    // 1. Find the campaign
    const campaign = await CampaignModel.findOne({ code: campaignCode, isActive: true, isDeleted: false });
    if (!campaign) {
        return { validation: false };
    }

    // 2. Find the member
    const member = await UserModel.findOne({ referralCode, isActive: true, isDeleted: false });
    if (!member) {
        return { validation: false };
    }

    // 3. Validate member association with campaign
    const isAssociated = member.campaignAssigned?.toString() === campaign._id.toString() ||
                         member.groupAssigned?.toString() === campaign.groupId?.toString();
    if (!isAssociated) {
        return { validation: false };
    }

    // 4. Get the group
    const group = await GroupModel.findOne({ _id: campaign.groupId, isDeleted: false });
    if (!group) {
        return { validation: false };
    }

    // 5. Get the admin (creator of the group)
    const admin = await UserModel.findOne({ _id: group.createdBy, isDeleted: false });
    const adminName = admin ? admin.name : "";

    // 6. Get total count of products in this campaign
    const totalProducts = await CampaignProductModel.countDocuments({
        campaignId: campaign._id,
        isDeleted: false,
    });

    return {
        validation: true,
        adminName,
        groupName: group.name,
        campaignName: campaign.name,
        campaignProductCount: totalProducts,
    };
};

const getSellerDashboardStats = async (groupId: string | undefined) => {
    if (!groupId) {
        return {
            totalSales: 0,
            totalProfit: 0,
            packagesSold: 0,
            daysRemaining: 0,
        };
    }

    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) {
        return {
            totalSales: 0,
            totalProfit: 0,
            packagesSold: 0,
            daysRemaining: 0,
        };
    }

    const campaign = await CampaignModel.findOne({ groupId: group._id, isDeleted: false });
    if (!campaign) {
        return {
            totalSales: 0,
            totalProfit: 0,
            packagesSold: 0,
            daysRemaining: 0,
        };
    }

    const ordersStats = await OrderModel.aggregate([
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

    return {
        totalSales,
        totalProfit,
        packagesSold,
        daysRemaining,
    };
};

export const dashboardServices = {
    getDashboardStats,
    getDashboardStatus,
    getStoreInfo,
    getSellerDashboardStats,
};
