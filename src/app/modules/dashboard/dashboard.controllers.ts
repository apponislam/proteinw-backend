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

export const dashboardControllers = {
    getDashboardStats,
    getDashboardStatus,
    getStoreInfo,
};
