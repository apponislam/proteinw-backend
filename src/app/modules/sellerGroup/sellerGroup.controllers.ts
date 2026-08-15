import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { sellerGroupServices } from "./sellerGroup.services";

const joinGroup = catchAsync(async (req: Request, res: Response) => {
    const sellerId = req.user._id;
    const { groupId, invitationCode, code } = req.body;
    const targetCode = invitationCode || code;

    let result;
    if (targetCode) {
        result = await sellerGroupServices.joinGroupByInvitationCode(sellerId as string, targetCode as string);
    } else {
        result = await sellerGroupServices.joinGroup(sellerId as string, groupId as string);
    }

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Joined group successfully",
        data: result,
    });
});

const joinGroupByInvitationCode = catchAsync(async (req: Request, res: Response) => {
    const sellerId = req.user._id;
    const { invitationCode, code } = req.body;
    const targetCode = invitationCode || code || req.params.code;

    console.log(sellerId, code, invitationCode);

    const result = await sellerGroupServices.joinGroupByInvitationCode(sellerId as string, targetCode as string);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Joined group via invitation code successfully",
        data: result,
    });
});

const getMyJoinedGroups = catchAsync(async (req: Request, res: Response) => {
    const sellerId = req.user._id;
    const result = await sellerGroupServices.getMyJoinedGroups(sellerId as string, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Joined groups retrieved successfully",
        data: result.data,
        meta: result.pagination,
    });
});

const getGroupSellers = catchAsync(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const result = await sellerGroupServices.getGroupSellers(groupId as string, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Group sellers retrieved successfully",
        data: result.data,
        meta: result.pagination,
    });
});

export const sellerGroupControllers = {
    joinGroup,
    joinGroupByInvitationCode,
    getMyJoinedGroups,
    getGroupSellers,
};
