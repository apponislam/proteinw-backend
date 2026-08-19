import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { Request, Response } from "express";
import { activityLogServices } from "./activityLog.services";
import ApiError from "../../../errors/ApiError";

const getAllActivities = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized access");
    }

    const result = await activityLogServices.getAllActivities(user, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Activities retrieved successfully",
        data: result.data,
        meta: result.pagination,
    });
});

export const activityLogControllers = {
    getAllActivities,
};
