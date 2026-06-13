import { UserModel } from "../auth/auth.model";
import { GroupModel } from "../group/group.model";
import { CampaignModel } from "../campaign/campaign.model";
import { OrderModel } from "../order/order.model";
import { ProductModel } from "../product/product.model";

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

export const dashboardServices = {
    getDashboardStats,
    getDashboardStatus,
};
