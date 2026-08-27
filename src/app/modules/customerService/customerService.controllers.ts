import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { customerServiceServices } from "./customerService.services";

const createCustomerServiceRequest = catchAsync(async (req: Request, res: Response) => {
    let images: string[] = [];

    // Collect uploaded file paths from Multer if present
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        images = (req.files as Express.Multer.File[]).map((file) => file.filename);
    } else if (req.body.images) {
        if (Array.isArray(req.body.images)) {
            images = req.body.images;
        } else if (typeof req.body.images === "string") {
            try {
                images = JSON.parse(req.body.images);
            } catch {
                images = [req.body.images];
            }
        }
    }

    const payload = {
        ...req.body,
        images,
    };

    const result = await customerServiceServices.createCustomerServiceRequest(payload);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Customer service request submitted successfully.",
        data: result,
    });
});

const getAllCustomerServiceRequests = catchAsync(async (req: Request, res: Response) => {
    const result = await customerServiceServices.getAllCustomerServiceRequests(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Customer service requests retrieved successfully.",
        data: result.data,
        meta: result.pagination,
    });
});

const getCustomerServiceRequestById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await customerServiceServices.getCustomerServiceRequestById(id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Customer service request details retrieved successfully.",
        data: result,
    });
});

const updateCustomerServiceRequest = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await customerServiceServices.updateCustomerServiceRequest(id as string, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Customer service request updated successfully.",
        data: result,
    });
});

const deleteCustomerServiceRequest = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    await customerServiceServices.deleteCustomerServiceRequest(id as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Customer service request deleted successfully.",
        data: null,
    });
});

export const customerServiceControllers = {
    createCustomerServiceRequest,
    getAllCustomerServiceRequests,
    getCustomerServiceRequestById,
    updateCustomerServiceRequest,
    deleteCustomerServiceRequest,
};
