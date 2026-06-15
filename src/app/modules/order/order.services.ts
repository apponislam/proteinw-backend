import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { OrderModel } from "./order.model";
import { ProductModel } from "../product/product.model";
import { CampaignProductModel } from "../campaignProduct/campaignProduct.model";
import { UserModel } from "../auth/auth.model";
import { CampaignModel } from "../campaign/campaign.model";
import { GroupModel } from "../group/group.model";
import { TierModel } from "../tier/tier.model";
import { sendOrderConfirmationEmail } from "../../../utils/emailTemplates";
import { activityLogServices } from "../activityLog/activityLog.services";
import { ActivityLogModel } from "../activityLog/activityLog.model";

// Create a guest order
const createOrder = async (payload: any) => {
    const { items, memberId, campaignId, referralCode, campaignCode, ...customerData } = payload;

    const targetCampaignCode = campaignCode || campaignId;
    const targetReferralCode = referralCode || memberId;

    // Resolve campaignCode
    let resolvedCampaignId: Types.ObjectId | undefined = undefined;
    let campaign = null;
    if (targetCampaignCode) {
        campaign = await CampaignModel.findOne({ code: targetCampaignCode, isDeleted: false });

        if (!campaign) {
            throw new ApiError(httpStatus.NOT_FOUND, "Campaign not found");
        }

        if (!campaign.isActive) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Campaign is not active");
        }

        resolvedCampaignId = campaign._id as Types.ObjectId;
    }

    // Resolve referralCode
    let resolvedMemberId: Types.ObjectId | undefined = undefined;
    let member = null;
    if (targetReferralCode) {
        member = await UserModel.findOne({ referralCode: targetReferralCode, isDeleted: false });

        if (!member) {
            throw new ApiError(httpStatus.NOT_FOUND, "Member not found");
        }

        resolvedMemberId = member._id as Types.ObjectId;
    }

    const resolvedGroupId = campaign?.groupId 
        ? (campaign.groupId as Types.ObjectId) 
        : undefined;

    // Validate items and calculate prices
    const productIds = items.map((item: any) => new Types.ObjectId(item.productId));
    const products = await ProductModel.find({
        _id: { $in: productIds },
        isActive: true,
        isDeleted: false,
    });

    if (products.length !== items.length) {
        throw new ApiError(httpStatus.NOT_FOUND, "One or more products not found or inactive");
    }

    // If campaign is specified, ensure all products are in the campaign
    if (resolvedCampaignId) {
        const campaignProducts = await CampaignProductModel.find({
            campaignId: resolvedCampaignId,
            productId: { $in: productIds },
            isDeleted: false,
        });

        if (campaignProducts.length !== items.length) {
            throw new ApiError(httpStatus.BAD_REQUEST, "One or more products not available in this campaign");
        }
    }

    // Build order items with product info
    let totalPrice = 0;
    let totalPackage = 0;
    const orderItems = items.map((item: any) => {
        const product = products.find((p: any) => p._id.toString() === item.productId.toString());
        if (!product) {
            throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
        }

        const lineTotal = product.price * item.quantity;
        totalPrice += lineTotal;
        totalPackage += item.quantity;

        return {
            productId: product._id,
            productName: product.name,
            quantity: item.quantity,
            singlePrice: product.price,
            lineTotal,
        };
    });

    const order = await OrderModel.create({
        ...customerData,
        items: orderItems,
        totalPrice,
        totalPackage,
        memberId: resolvedMemberId,
        campaignId: resolvedCampaignId,
        groupId: resolvedGroupId,
    });

    // Update campaign tier based on total packages sold
    if (resolvedCampaignId) {
        try {
            const campaignOrders = await OrderModel.aggregate([
                { $match: { campaignId: resolvedCampaignId, isDeleted: false } },
                { $group: { _id: null, totalPackages: { $sum: "$totalPackage" } } }
            ]);
            const totalPackagesForCampaign = campaignOrders.length > 0 ? campaignOrders[0].totalPackages : 0;

            const eligibleTier = await TierModel.findOne({
                isActive: true,
                isDeleted: false,
                minSalesVolume: { $lte: totalPackagesForCampaign }
            }).sort({ minSalesVolume: -1 });

            if (eligibleTier) {
                await CampaignModel.updateOne(
                    { _id: resolvedCampaignId },
                    { $set: { tierId: eligibleTier._id } }
                );
            }
        } catch (tierError) {
            console.error("Failed to update campaign tier:", tierError);
        }
    }

    // Send order confirmation email
    try {
        sendOrderConfirmationEmail(customerData.customerEmail, customerData.customerName, {
            items: orderItems,
            totalPrice,
            address: customerData.address,
            status: order.status,
        });
    } catch (emailError) {
        console.error("Failed to send order confirmation email:", emailError);
        // Continue even if email fails
    }

    // Log Activity (New Sale Logged & Milestone Reached)
    try {
        let sellerName = customerData.customerName || "Someone";
        if (member) {
            sellerName = member.name;
        }
        const firstItem = orderItems[0];
        const itemText = firstItem ? `${firstItem.quantity}x '${firstItem.productName}'` : "products";
        const description = `${sellerName} sold ${itemText}`;

        const dbGroupId = resolvedGroupId;

        if (dbGroupId) {
            await activityLogServices.createActivityLog({
                groupId: dbGroupId,
                type: "SALE",
                title: "New Sale Logged",
                description,
            });

            // Check Milestone reached for Campaign
            if (resolvedCampaignId) {
                const campaignOrders = await OrderModel.aggregate([
                    { $match: { campaignId: resolvedCampaignId, isDeleted: false } },
                    { $group: { _id: null, totalPackages: { $sum: "$totalPackage" } } }
                ]);
                const totalPackagesForCampaign = campaignOrders.length > 0 ? campaignOrders[0].totalPackages : 0;

                if (campaign && campaign.target > 0) {
                    const percentage = Math.round((totalPackagesForCampaign / campaign.target) * 100);
                    
                    let thresholdReached = 0;
                    if (percentage >= 100) thresholdReached = 100;
                    else if (percentage >= 70) thresholdReached = 70;
                    else if (percentage >= 50) thresholdReached = 50;
                    else if (percentage >= 25) thresholdReached = 25;

                    if (thresholdReached > 0) {
                        const milestoneDesc = `${thresholdReached}% of Group Goal Achieved!`;
                        const alreadyLogged = await ActivityLogModel.findOne({
                            type: "MILESTONE",
                            description: milestoneDesc,
                        });
                        if (!alreadyLogged) {
                            await activityLogServices.createActivityLog({
                                groupId: dbGroupId,
                                type: "MILESTONE",
                                title: "Milestone Reached",
                                description: milestoneDesc,
                            });
                        }
                    }
                }
            }
        }
    } catch (activityError) {
        console.error("Failed to create activity log for sale:", activityError);
    }

    return order;
};

// Get all orders (admin/super admin only)
const getAllOrders = async (query: any = {}) => {
    const filter: any = { isDeleted: false };

    if (query.status) filter.status = query.status;
    if (query.memberId) filter.memberId = new Types.ObjectId(query.memberId);
    if (query.campaignId) filter.campaignId = new Types.ObjectId(query.campaignId);
    if (query.groupId) filter.groupId = new Types.ObjectId(query.groupId);

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const orders = await OrderModel.find(filter).populate("memberId", "name email").populate("campaignId", "name code").populate("groupId", "name").sort({ createdAt: -1 }).skip(skip).limit(limit);

    const total = await OrderModel.countDocuments(filter);

    return {
        data: orders,
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

// Get orders by member (for logged in members)
const getOrdersByMember = async (memberId: string, query: any = {}) => {
    const filter: any = { memberId: new Types.ObjectId(memberId), isDeleted: false };
    if (query.status) filter.status = query.status;

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const orders = await OrderModel.find(filter).populate("campaignId", "name code").populate("groupId", "name").sort({ createdAt: -1 }).skip(skip).limit(limit);

    const total = await OrderModel.countDocuments(filter);

    return {
        data: orders,
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

// Get single order by ID
const getOrderById = async (orderId: string) => {
    const order = await OrderModel.findOne({ _id: orderId, isDeleted: false }).populate("memberId", "name email").populate("campaignId", "name code").populate("groupId", "name");

    if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
    return order;
};

// Update order status (admin/super admin only)
const updateOrderStatus = async (orderId: string, status: string) => {
    const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid status");
    }

    // First check if order exists and is not deleted
    const existingOrder = await OrderModel.findOne({ _id: orderId, isDeleted: false });
    if (!existingOrder) throw new ApiError(httpStatus.NOT_FOUND, "Order not found");

    // Check if current status is delivered
    if (existingOrder.status === "delivered") {
        throw new ApiError(httpStatus.BAD_REQUEST, "Cannot change status of a delivered order");
    }

    const order = await OrderModel.findOneAndUpdate({ _id: orderId, isDeleted: false }, { $set: { status } }, { returnDocument: "after", runValidators: true });

    if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
    return order;
};

// Soft delete an order (admin only)
const deleteOrder = async (orderId: string) => {
    const order = await OrderModel.findOneAndUpdate({ _id: orderId, isDeleted: false }, { $set: { isDeleted: true } }, { returnDocument: "after" });

    if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
    return order;
};

// Get order stats for Admin / Super Admin
const getOrderStats = async () => {
    // 1. Total Revenue: sum of totalPrice of non-cancelled and non-deleted orders
    const totalRevenueResult = await OrderModel.aggregate([
        {
            $match: {
                status: { $ne: "cancelled" },
                isDeleted: false,
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$totalPrice" },
            },
        },
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    // 2. Active Orders count: pending, confirmed, shipped status, and not deleted
    const activeOrdersCount = await OrderModel.countDocuments({
        status: { $in: ["pending", "confirmed", "shipped"] },
        isDeleted: false,
    });

    // 3. Month-to-Date (MTD) Sales: sum of totalPrice of non-cancelled/non-deleted orders since the start of the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const mtdSalesResult = await OrderModel.aggregate([
        {
            $match: {
                status: { $ne: "cancelled" },
                isDeleted: false,
                createdAt: { $gte: startOfMonth },
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$totalPrice" },
            },
        },
    ]);
    const mtdSales = mtdSalesResult[0]?.total || 0;

    return {
        totalRevenue,
        activeOrders: activeOrdersCount,
        mtdSales,
    };
};

const getRunningCampaignOrders = async (campaignId: Types.ObjectId | string, query: any = {}) => {
    if (!campaignId) {
        throw new ApiError(httpStatus.BAD_REQUEST, "No running campaign assigned to this admin");
    }

    const filter: any = { 
        campaignId: new Types.ObjectId(campaignId), 
        isDeleted: false 
    };

    if (query.status) filter.status = query.status;
    if (query.memberId) filter.memberId = new Types.ObjectId(query.memberId);

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const orders = await OrderModel.find(filter)
        .populate("memberId", "name email")
        .populate("campaignId", "name code")
        .populate("groupId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await OrderModel.countDocuments(filter);

    return {
        data: orders,
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

const getRunningCampaignStats = async (campaignId: Types.ObjectId | string) => {
    if (!campaignId) {
        throw new ApiError(httpStatus.BAD_REQUEST, "No running campaign assigned to this admin");
    }

    const campId = new Types.ObjectId(campaignId);

    // 1. Total Revenue: sum of totalPrice of non-cancelled and non-deleted orders for this campaign
    const totalRevenueResult = await OrderModel.aggregate([
        {
            $match: {
                campaignId: campId,
                status: { $ne: "cancelled" },
                isDeleted: false,
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$totalPrice" },
            },
        },
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    // 2. Active Orders count: pending, confirmed, shipped status, and not deleted for this campaign
    const activeOrdersCount = await OrderModel.countDocuments({
        campaignId: campId,
        status: { $in: ["pending", "confirmed", "shipped"] },
        isDeleted: false,
    });

    // 3. Month-to-Date (MTD) Sales: sum of totalPrice of non-cancelled/non-deleted orders since the start of the current month for this campaign
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const mtdSalesResult = await OrderModel.aggregate([
        {
            $match: {
                campaignId: campId,
                status: { $ne: "cancelled" },
                isDeleted: false,
                createdAt: { $gte: startOfMonth },
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$totalPrice" },
            },
        },
    ]);
    const mtdSales = mtdSalesResult[0]?.total || 0;

    return {
        totalRevenue,
        activeOrders: activeOrdersCount,
        mtdSales,
    };
};

const getCampaignContributors = async (groupId: string | Types.ObjectId | undefined) => {
    if (!groupId) {
        return [];
    }

    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) {
        return [];
    }

    const campaign = await CampaignModel.findOne({ groupId: group._id, isDeleted: false });
    if (!campaign) {
        return [];
    }

    const ordersAggregation = await OrderModel.aggregate([
        {
            $match: {
                campaignId: campaign._id,
                status: { $ne: "cancelled" },
                isDeleted: false,
                memberId: { $ne: null },
            },
        },
        {
            $group: {
                _id: "$memberId",
                packagesSold: { $sum: "$totalPackage" },
                totalSales: { $sum: "$totalPrice" },
            },
        },
        {
            $sort: { packagesSold: -1 },
        },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "memberInfo",
            },
        },
        {
            $unwind: "$memberInfo",
        },
        {
            $project: {
                _id: "$_id",
                name: "$memberInfo.name",
                email: "$memberInfo.email",
                referralCode: "$memberInfo.referralCode",
                packages: "$packagesSold",
                sales: "$totalSales",
            },
        },
    ]);

    const contributors = ordersAggregation.map(item => {
        const nameParts = (item.name || "").trim().split(/\s+/);
        const initials = nameParts.length > 1 
            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
            : (nameParts[0]?.[0] || "").toUpperCase();

        return {
            _id: item._id,
            name: item.name,
            email: item.email,
            referralCode: item.referralCode,
            initials,
            packages: item.packages,
            sales: item.sales,
        };
    });

    return contributors;
};

export const orderServices = {
    createOrder,
    getAllOrders,
    getOrdersByMember,
    getOrderById,
    updateOrderStatus,
    deleteOrder,
    getOrderStats,
    getRunningCampaignOrders,
    getRunningCampaignStats,
    getCampaignContributors,
};
