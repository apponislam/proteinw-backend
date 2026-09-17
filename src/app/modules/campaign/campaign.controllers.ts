import httpStatus from "http-status";
import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { campaignServices } from "./campaign.services";

const createCampaign = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.createCampaign(req.user._id as string, req.body.groupId as string, req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Försäljning skapad framgångsrikt",
        data: result,
    });
});

const getAllCampaigns = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.getAllCampaigns(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Försäljningar hämtades framgångsrikt",
        data: result.data,
        meta: result.pagination,
    });
});

const getAllCampaignsWithStats = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.getAllCampaignsWithStats(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Försäljningar med statistik hämtades framgångsrikt",
        data: result.data,
        meta: result.pagination,
    });
});

const getAllCampaignsSummary = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.getAllCampaignsSummary(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Försäljningssammanfattning hämtades framgångsrikt",
        data: result.data,
        meta: result.pagination,
    });
});

const getActiveCampaigns = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.getActiveCampaigns();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Aktiva försäljningar hämtades framgångsrikt",
        data: result,
    });
});

const getCampaignById = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.getCampaignById(req.params.campaignId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Försäljning hämtades framgångsrikt",
        data: result,
    });
});

const getCampaignByCode = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.getCampaignByCode(req.params.code as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Försäljning hämtades framgångsrikt",
        data: result,
    });
});

const getCampaignsByGroup = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.getCampaignsByGroup(req.params.groupId as string, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Försäljningar hämtades framgångsrikt",
        data: result.data,
        meta: result.pagination,
    });
});

const updateCampaign = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.updateCampaign(req.params.campaignId as string, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Försäljning uppdaterades framgångsrikt",
        data: result,
    });
});

const updateCampaignStatus = catchAsync(async (req: Request, res: Response) => {
    const { status } = req.body;
    const result = await campaignServices.updateCampaignStatus(req.params.campaignId as string, status);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Försäljningsstatus ändrades till ${status} framgångsrikt`,
        data: result,
    });
});

const deleteCampaign = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.deleteCampaign(req.params.campaignId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Försäljning raderades framgångsrikt",
        data: result,
    });
});

const getRunningCampaignByGroup = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.getRunningCampaignByGroup(req.params.groupId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Pågående försäljning för grupp hämtades framgångsrikt",
        data: result,
    });
});

const getRunningCampaignForSeller = catchAsync(async (req: Request, res: Response) => {
    const result = await campaignServices.getRunningCampaignForSeller(req.user._id as string, req.params.groupId as string, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Pågående försäljningar för ansluten säljargrupp hämtades framgångsrikt",
        data: result.data,
        meta: result.pagination,
    });
});

const assignTierToCampaign = catchAsync(async (req: Request, res: Response) => {
    const { campaignId, tierId } = req.body;
    const result = await campaignServices.assignTierToCampaign(campaignId || (req.params.campaignId as string), tierId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Nivå tilldelades försäljningen framgångsrikt",
        data: result,
    });
});

const getMyCampaigns = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const result = await campaignServices.getMyCampaigns(user, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Mina försäljningar hämtades framgångsrikt",
        data: result.data,
        meta: result.pagination,
    });
});

export const campaignControllers = {
    createCampaign,
    getAllCampaigns,
    getMyCampaigns,
    getAllCampaignsWithStats,
    getAllCampaignsSummary,
    getActiveCampaigns,
    getCampaignById,
    getCampaignByCode,
    getCampaignsByGroup,
    getRunningCampaignByGroup,
    getRunningCampaignForSeller,
    assignTierToCampaign,
    updateCampaign,
    updateCampaignStatus,
    deleteCampaign,
};
