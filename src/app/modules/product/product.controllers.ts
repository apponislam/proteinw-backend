import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { Request, Response } from "express";
import { productServices } from "./product.services";

const createProduct = catchAsync(async (req: Request, res: Response) => {
    const productImage = req.file?.filename;
    const result = await productServices.createProduct(req.user._id, req.body, productImage);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Product created successfully",
        data: result,
    });
});

// Admin: get all products (including inactive), with optional filters
const getAllProducts = catchAsync(async (req: Request, res: Response) => {
    const result = await productServices.getAllProducts(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Products retrieved successfully",
        data: result,
    });
});

// Public: get only active products, optionally filtered by category
const getActiveProducts = catchAsync(async (req: Request, res: Response) => {
    const category = req.query.category as string | undefined;
    const result = await productServices.getActiveProducts(category);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Products retrieved successfully",
        data: result,
    });
});

const getProductById = catchAsync(async (req: Request, res: Response) => {
    const result = await productServices.getProductById(req.params.productId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Product retrieved successfully",
        data: result,
    });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
    const productImage = req.file?.filename;
    const result = await productServices.updateProduct(req.params.productId as string, req.body, productImage);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Product updated successfully",
        data: result,
    });
});

const toggleProductStatus = catchAsync(async (req: Request, res: Response) => {
    const result = await productServices.toggleProductStatus(req.params.productId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `Product ${result.isActive ? "activated" : "deactivated"} successfully`,
        data: result,
    });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
    await productServices.deleteProduct(req.params.productId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Product deleted successfully",
        data: null,
    });
});

export const productControllers = {
    createProduct,
    getAllProducts,
    getActiveProducts,
    getProductById,
    updateProduct,
    toggleProductStatus,
    deleteProduct,
};
