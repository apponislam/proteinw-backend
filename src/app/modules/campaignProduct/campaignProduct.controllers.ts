import httpStatus from "http-status";
import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { campaignProductServices } from "./campaignProduct.services";

// Add single product to campaign
const addProductToCampaign = catchAsync(async (req: Request, res: Response) => {
    const { campaignId, productId } = req.params;
    const result = await campaignProductServices.addProductToCampaign(campaignId as string, productId as string);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Product added to campaign successfully",
        data: result,
    });
});

// Add multiple products to campaign
const addMultipleProductsToCampaign = catchAsync(async (req: Request, res: Response) => {
    const { campaignId } = req.params;
    const { productIds } = req.body;
    const result = await campaignProductServices.addMultipleProductsToCampaign(campaignId as string, productIds);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Products added to campaign successfully",
        data: result,
    });
});

// Remove single product from campaign
const removeProductFromCampaign = catchAsync(async (req: Request, res: Response) => {
    const { campaignId, productId } = req.params;
    const result = await campaignProductServices.removeProductFromCampaign(campaignId as string, productId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Product removed from campaign successfully",
        data: result,
    });
});

// Remove multiple products from campaign
const removeMultipleProductsFromCampaign = catchAsync(async (req: Request, res: Response) => {
    const { campaignId } = req.params;
    const { productIds } = req.body;
    const result = await campaignProductServices.removeMultipleProductsFromCampaign(campaignId as string, productIds);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Products removed from campaign successfully",
        data: result,
    });
});

// Get all products in a campaign
const getProductsByCampaign = catchAsync(async (req: Request, res: Response) => {
    const { campaignId } = req.params;
    const result = await campaignProductServices.getProductsByCampaign(campaignId as string, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Campaign products retrieved successfully",
        data: result.data,
        meta: result.pagination,
    });
});

// Get all campaigns that include a specific product
const getCampaignsByProduct = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const result = await campaignProductServices.getCampaignsByProduct(productId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Product campaigns retrieved successfully",
        data: result,
    });
});

export const campaignProductControllers = {
    addProductToCampaign,
    addMultipleProductsToCampaign,
    removeProductFromCampaign,
    removeMultipleProductsFromCampaign,
    getProductsByCampaign,
    getCampaignsByProduct,
};
