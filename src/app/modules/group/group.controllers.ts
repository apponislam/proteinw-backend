import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { Request, Response } from "express";
import { groupServices } from "./group.services";

const createGroup = catchAsync(async (req: Request, res: Response) => {
    const result = await groupServices.createGroup(req.user._id, req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Group created successfully",
        data: result,
    });
});

// Admin: get all groups (including inactive)
const getAllGroups = catchAsync(async (req: Request, res: Response) => {
    const result = await groupServices.getAllGroups(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Groups retrieved successfully",
        data: result.data,
        meta: result.pagination,
    });
});

// Public: get only active groups
const getActiveGroups = catchAsync(async (_req: Request, res: Response) => {
    const result = await groupServices.getActiveGroups();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Groups retrieved successfully",
        data: result,
    });
});

const getGroupById = catchAsync(async (req: Request, res: Response) => {
    const result = await groupServices.getGroupById(req.params.groupId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Group retrieved successfully",
        data: result,
    });
});

const getGroupByCode = catchAsync(async (req: Request, res: Response) => {
    const result = await groupServices.getGroupByCode(req.params.code as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Group retrieved successfully",
        data: result,
    });
});

const updateGroup = catchAsync(async (req: Request, res: Response) => {
    const result = await groupServices.updateGroup(req.params.groupId as string, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Group updated successfully",
        data: result,
    });
});

const toggleGroupStatus = catchAsync(async (req: Request, res: Response) => {
    const result = await groupServices.toggleGroupStatus(req.params.groupId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Group ${result.isActive ? "activated" : "deactivated"} successfully`,
        data: result,
    });
});

const deleteGroup = catchAsync(async (req: Request, res: Response) => {
    await groupServices.deleteGroup(req.params.groupId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Group deleted successfully",
        data: null,
    });
});

const getMyGroup = catchAsync(async (req: Request, res: Response) => {
    const groupId = (req.user as any)?.groupAssigned;
    const result = await groupServices.getMyGroup(groupId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Your group retrieved successfully",
        data: result,
    });
});

export const groupControllers = {
    createGroup,
    getAllGroups,
    getActiveGroups,
    getGroupById,
    getGroupByCode,
    updateGroup,
    toggleGroupStatus,
    deleteGroup,
    getMyGroup,
};
