import httpStatus from "http-status";
import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { orderServices } from "./order.services";

// Create a guest order (public endpoint - no auth required)
const createOrder = catchAsync(async (req: Request, res: Response) => {
    const result = await orderServices.createOrder(req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Order placed successfully",
        data: result,
    });
});

// Get all orders (admin and super admin only)
const getAllOrders = catchAsync(async (req: Request, res: Response) => {
    const result = await orderServices.getAllOrders(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Orders retrieved successfully",
        data: result.data,
        meta: result.pagination,
    });
});

// Get orders by logged in member
const getOrdersByMember = catchAsync(async (req: Request, res: Response) => {
    const memberId = req.user!._id as string;
    const result = await orderServices.getOrdersByMember(memberId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Member orders retrieved successfully",
        data: result.data,
        meta: result.pagination,
    });
});

// Get single order by ID
const getOrderById = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const result = await orderServices.getOrderById(orderId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Order retrieved successfully",
        data: result,
    });
});

// Update order status (admin and super admin only)
const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { status } = req.body;
    const result = await orderServices.updateOrderStatus(orderId, status);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Order status updated successfully",
        data: result,
    });
});

// Soft delete an order (admin and super admin only)
const deleteOrder = catchAsync(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const result = await orderServices.deleteOrder(orderId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Order deleted successfully",
        data: result,
    });
});

export const orderControllers = {
    createOrder,
    getAllOrders,
    getOrdersByMember,
    getOrderById,
    updateOrderStatus,
    deleteOrder,
};
