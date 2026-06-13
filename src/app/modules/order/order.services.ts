import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { OrderModel } from "./order.model";
import { ProductModel } from "../product/product.model";
import { CampaignProductModel } from "../campaignProduct/campaignProduct.model";
import { UserModel } from "../auth/auth.model";
import { CampaignModel } from "../campaign/campaign.model";
import { TierModel } from "../tier/tier.model";
import { sendOrderConfirmationEmail } from "../../../utils/emailTemplates";
import { activityLogServices } from "../activityLog/activityLog.services";
import { ActivityLogModel } from "../activityLog/activityLog.model";

// Create a guest order
const createOrder = async (payload: any) => {
    const { items, memberId, campaignId, groupId, ...customerData } = payload;

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
    if (campaignId) {
        const campaignProducts = await CampaignProductModel.find({
            campaignId: new Types.ObjectId(campaignId),
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
        memberId: memberId ? new Types.ObjectId(memberId) : undefined,
        campaignId: campaignId ? new Types.ObjectId(campaignId) : undefined,
        groupId: groupId ? new Types.ObjectId(groupId) : undefined,
    });

    // Update campaign tier based on total packages sold
    if (campaignId) {
        try {
            const campaignOrders = await OrderModel.aggregate([
                { $match: { campaignId: new Types.ObjectId(campaignId), isDeleted: false } },
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
                    { _id: new Types.ObjectId(campaignId) },
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
        if (memberId) {
            const member = await UserModel.findById(memberId);
            if (member) sellerName = member.name;
        }
        const firstItem = orderItems[0];
        const itemText = firstItem ? `${firstItem.quantity}x '${firstItem.productName}'` : "products";
        const description = `${sellerName} sold ${itemText}`;

        const campaign = campaignId ? await CampaignModel.findById(campaignId) : null;
        const dbGroupId = groupId 
            ? new Types.ObjectId(groupId) 
            : (campaign?.groupId ? campaign.groupId : undefined);

        if (dbGroupId) {
            await activityLogServices.createActivityLog({
                groupId: dbGroupId,
                type: "SALE",
                title: "New Sale Logged",
                description,
            });

            // Check Milestone reached for Campaign
            if (campaignId) {
                const campaignOrders = await OrderModel.aggregate([
                    { $match: { campaignId: new Types.ObjectId(campaignId), isDeleted: false } },
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

export const orderServices = {
    createOrder,
    getAllOrders,
    getOrdersByMember,
    getOrderById,
    updateOrderStatus,
    deleteOrder,
};
