import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { campaignSellerServices } from "./campaignSeller.services";

const joinCampaign = catchAsync(async (req: Request, res: Response) => {
    const sellerId = req.user._id;
    const { campaignId } = req.body;

    const result = await campaignSellerServices.joinCampaign(sellerId as string, campaignId as string);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Joined campaign successfully",
        data: result,
    });
});

const getMyJoinedCampaigns = catchAsync(async (req: Request, res: Response) => {
    const sellerId = req.user._id;
    const result = await campaignSellerServices.getMyJoinedCampaigns(sellerId as string, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Joined campaigns retrieved successfully",
        data: result.data,
        meta: result.pagination,
    });
});

const getCampaignSellers = catchAsync(async (req: Request, res: Response) => {
    const { campaignId } = req.params;
    const result = await campaignSellerServices.getCampaignSellers(campaignId as string, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Campaign sellers retrieved successfully",
        data: result.data,
        meta: result.pagination,
    });
});

export const campaignSellerControllers = {
    joinCampaign,
    getMyJoinedCampaigns,
    getCampaignSellers,
};
