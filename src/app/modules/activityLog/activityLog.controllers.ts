import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { Request, Response } from "express";
import { activityLogServices } from "./activityLog.services";

const getAllActivities = catchAsync(async (req: Request, res: Response) => {
    const result = await activityLogServices.getAllActivities(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Activities retrieved successfully",
        data: result,
    });
});

export const activityLogControllers = {
    getAllActivities,
};
