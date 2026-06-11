import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { dashboardServices } from "./dashboard.services";

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardServices.getDashboardStats();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Dashboard stats retrieved successfully",
        data: result,
    });
});

export const dashboardControllers = {
    getDashboardStats,
};
