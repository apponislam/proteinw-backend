import httpStatus from "http-status";
import { Request, Response } from "express";
import { invitationServices } from "./invitation.services";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";

const sendInvitation = catchAsync(async (req: Request, res: Response) => {
    const result = await invitationServices.sendInvitation(req.user?._id as string, req.body.groupId as string, req.body.email as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Invitation sent successfully",
        data: result,
    });
});

const getInvitationsByGroup = catchAsync(async (req: Request, res: Response) => {
    const result = await invitationServices.getInvitationsByGroup(req.params.groupId as string, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Invitations retrieved successfully",
        data: result.data,
        meta: result.pagination,
    });
});

const getInvitationByEmail = catchAsync(async (req: Request, res: Response) => {
    const result = await invitationServices.getInvitationByEmail(req.params.email as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Invitation retrieved successfully",
        data: result,
    });
});

const cancelInvitation = catchAsync(async (req: Request, res: Response) => {
    const result = await invitationServices.cancelInvitation(req.params.invitationId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

export const invitationControllers = {
    sendInvitation,
    getInvitationsByGroup,
    getInvitationByEmail,
    cancelInvitation,
};
