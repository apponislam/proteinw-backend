import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { Request, Response } from "express";
import { activityLogServices } from "./activityLog.services";
import { SellerGroupModel } from "../sellerGroup/sellerGroup.model";
import ApiError from "../../../errors/ApiError";

const getAllActivities = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized access");
    }

    const sellerGroupJoin = await SellerGroupModel.findOne({ sellerId: user._id, isDeleted: false });
    const groupId = sellerGroupJoin?.groupId;

    if (!groupId) {
        return sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Activities retrieved successfully",
            data: [],
            meta: {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
            },
        });
    }

    const result = await activityLogServices.getAllActivities({
        ...req.query,
        groupId: groupId.toString(),
    });

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
