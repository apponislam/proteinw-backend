import httpStatus from "http-status";
import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { campaignServices } from "./campaign.services";

const createCampaign = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.createCampaign(
        req.user._id as string,
        req.body.groupId as string,
        req.body
    );

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Campaign created successfully",
        data: result,
    });
});

const getAllCampaigns = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.getAllCampaigns(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Campaigns retrieved successfully",
        data: result.data,
        meta: result.pagination,
    });
});

const getAllCampaignsWithStats = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.getAllCampaignsWithStats(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Campaigns with stats retrieved successfully",
        data: result.data,
        meta: result.pagination,
    });
});

const getActiveCampaigns = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.getActiveCampaigns();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Active campaigns retrieved successfully",
        data: result,
    });
});

const getCampaignById = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.getCampaignById(req.params.campaignId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Campaign retrieved successfully",
        data: result,
    });
});

const getCampaignByCode = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.getCampaignByCode(req.params.code as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Campaign retrieved successfully",
        data: result,
    });
});

const getCampaignsByGroup = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.getCampaignsByGroup(req.params.groupId as string, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Campaigns retrieved successfully",
        data: result.data,
        meta: result.pagination,
    });
});

const updateCampaign = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.updateCampaign(req.params.campaignId as string, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Campaign updated successfully",
        data: result,
    });
});

const toggleCampaignStatus = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.toggleCampaignStatus(req.params.campaignId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Campaign status updated successfully",
        data: result,
    });
});

const deleteCampaign = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.deleteCampaign(req.params.campaignId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Campaign deleted successfully",
        data: result,
    });
});

export const campaignControllers = {
    createCampaign,
    getAllCampaigns,
    getAllCampaignsWithStats,
    getActiveCampaigns,
    getCampaignById,
    getCampaignByCode,
    getCampaignsByGroup,
    updateCampaign,
    toggleCampaignStatus,
    deleteCampaign,
};
