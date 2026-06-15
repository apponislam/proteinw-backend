import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { dashboardServices } from "./dashboard.services";
import ApiError from "../../../errors/ApiError";

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardServices.getDashboardStats();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Dashboard stats retrieved successfully",
        data: result,
    });
});

const getDashboardStatus = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized access");
    }

    const result = await dashboardServices.getDashboardStatus(user._id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Dashboard status checked successfully",
        data: result,
    });
});

const getStoreInfo = catchAsync(async (req: Request, res: Response) => {
    const campaignCode = req.query.campaign as string;
    const referralCode = req.query.referral as string;

    if (!campaignCode || !referralCode) {
        return sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Validation failed - missing parameters",
            data: { validation: false },
        });
    }

    const result = await dashboardServices.getStoreInfo(campaignCode, referralCode);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Store information retrieved successfully",
        data: result,
    });
});

const getSellerDashboardStats = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as any;
    const result = await dashboardServices.getSellerDashboardStats(user?.groupAssigned, user?._id, user?.role);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Seller dashboard stats retrieved successfully",
        data: result,
    });
});

const getSuperAdminSellersStats = catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardServices.getSuperAdminSellersStats();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Super admin sellers statistics retrieved successfully",
        data: result,
    });
});

const getSuperAdminSellers = catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardServices.getSuperAdminSellers(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Super admin sellers retrieved successfully",
        data: result.data,
        meta: result.pagination,
    });
});

const getSuperAdminGroupsStats = catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardServices.getSuperAdminGroupsStats(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Super admin groups campaign stats retrieved successfully",
        data: result.data,
        meta: result.pagination,
    });
});

export const dashboardControllers = {
    getDashboardStats,
    getDashboardStatus,
    getStoreInfo,
    getSellerDashboardStats,
    getSuperAdminSellersStats,
    getSuperAdminSellers,
    getSuperAdminGroupsStats,
};
