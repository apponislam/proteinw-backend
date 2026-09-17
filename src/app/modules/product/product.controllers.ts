import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { Request, Response } from "express";
import { productServices } from "./product.services";

const createProduct = catchAsync(async (req: Request, res: Response) => {
    let images: string[] = [];
    if (req.files && Array.isArray(req.files)) {
        images = req.files.map((file: any) => file.filename);
    }
    const result = await productServices.createProduct(req.user._id, req.body, images);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Produkt skapad framgångsrikt",
        data: result,
    });
});

// Admin: get all products (including inactive), with optional filters
const getAllProducts = catchAsync(async (req: Request, res: Response) => {
    const result = await productServices.getAllProducts(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Produkter hämtades framgångsrikt",
        data: result.data,
        meta: result.meta,
    });
});

// Public: get only active products, optionally filtered by category
const getActiveProducts = catchAsync(async (req: Request, res: Response) => {
    const result = await productServices.getActiveProducts(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Produkter hämtades framgångsrikt",
        data: result.data,
        meta: result.meta,
    });
});

const getProductById = catchAsync(async (req: Request, res: Response) => {
    const result = await productServices.getProductById(req.params.productId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Produkt hämtades framgångsrikt",
        data: result,
    });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
    let newImages: string[] = [];
    if (req.files && Array.isArray(req.files)) {
        newImages = req.files.map((file: any) => file.filename);
    }

    let removeImages: string[] = [];
    if (req.body.removeImages) {
        if (typeof req.body.removeImages === "string") {
            try {
                removeImages = JSON.parse(req.body.removeImages);
            } catch {
                removeImages = [req.body.removeImages];
            }
        } else if (Array.isArray(req.body.removeImages)) {
            removeImages = req.body.removeImages;
        }
    }

    const result = await productServices.updateProduct(req.params.productId as string, req.body, newImages, removeImages);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Produkt uppdaterades framgångsrikt",
        data: result,
    });
});

const toggleProductStatus = catchAsync(async (req: Request, res: Response) => {
    const result = await productServices.toggleProductStatus(req.params.productId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Produkt ${result.isActive ? "aktiverades" : "inaktiverades"} framgångsrikt`,
        data: result,
    });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
    await productServices.deleteProduct(req.params.productId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Produkt raderades framgångsrikt",
        data: null,
    });
});

const getProductStats = catchAsync(async (req: Request, res: Response) => {
    const result = await productServices.getProductStats();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Produktstatistik hämtades framgångsrikt",
        data: result,
    });
});

const getProductsWithCampaignStatus = catchAsync(async (req: Request, res: Response) => {
    const campaignId = (req.params.campaignId || req.query.campaignId) as string;
    const result = await productServices.getProductsWithCampaignStatus(campaignId, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Produkter med försäljningsstatus hämtades framgångsrikt",
        data: result.data,
        meta: result.meta,
    });
});

export const productControllers = {
    createProduct,
    getAllProducts,
    getProductsWithCampaignStatus,
    getActiveProducts,
    getProductById,
    updateProduct,
    toggleProductStatus,
    deleteProduct,
    getProductStats,
};
