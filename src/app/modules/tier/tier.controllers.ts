import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { Request, Response } from "express";
import { tierServices } from "./tier.services";

const createTier = catchAsync(async (req: Request, res: Response) => {
    const result = await tierServices.createTier(req.user._id, req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Tier created successfully",
        data: result,
    });
});

// Admin: get all tiers (including inactive)
const getAllTiers = catchAsync(async (req: Request, res: Response) => {
    const result = await tierServices.getAllTiers(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Tiers retrieved successfully",
        data: result,
    });
});

// Public: get only active tiers
const getActiveTiers = catchAsync(async (_req: Request, res: Response) => {
    const result = await tierServices.getActiveTiers();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Tiers retrieved successfully",
        data: result,
    });
});

const getTierById = catchAsync(async (req: Request, res: Response) => {
    const result = await tierServices.getTierById(req.params.tierId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Tier retrieved successfully",
        data: result,
    });
});

const updateTier = catchAsync(async (req: Request, res: Response) => {
    const result = await tierServices.updateTier(req.params.tierId as string, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Tier updated successfully",
        data: result,
    });
});

const toggleTierStatus = catchAsync(async (req: Request, res: Response) => {
    const result = await tierServices.toggleTierStatus(req.params.tierId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Tier ${result.isActive ? "activated" : "deactivated"} successfully`,
        data: result,
    });
});

const deleteTier = catchAsync(async (req: Request, res: Response) => {
    await tierServices.deleteTier(req.params.tierId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Tier deleted successfully",
        data: null,
    });
});

export const tierControllers = {
    createTier,
    getAllTiers,
    getActiveTiers,
    getTierById,
    updateTier,
    toggleTierStatus,
    deleteTier,
};
