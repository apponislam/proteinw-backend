import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import {
    sendCustomerServiceConfirmationEmail,
    sendCustomerServiceReplyEmail,
} from "../../../utils/emailTemplates";
import { ICustomerServiceRequest } from "./customerService.interface";
import { CustomerServiceModel } from "./customerService.model";

// Create new customer service request
const createCustomerServiceRequest = async (payload: Partial<ICustomerServiceRequest>) => {
    if (!payload.issueType || !["reklamation", "byte"].includes(payload.issueType)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid issueType. Must be 'reklamation' or 'byte'.");
    }
    if (!payload.name) {
        throw new ApiError(httpStatus.BAD_REQUEST, "name is required.");
    }
    if (!payload.email) {
        throw new ApiError(httpStatus.BAD_REQUEST, "email is required.");
    }
    if (!payload.description) {
        throw new ApiError(httpStatus.BAD_REQUEST, "description is required.");
    }

    const customerService = await CustomerServiceModel.create({
        ...payload,
        status: payload.status || "pending",
        isDeleted: false,
    });

    // Send confirmation email asynchronously in background
    sendCustomerServiceConfirmationEmail(customerService.email, customerService.name, {
        _id: customerService._id.toString(),
        issueType: customerService.issueType,
        orderId: customerService.orderId ? customerService.orderId.toString() : undefined,
        description: customerService.description,
    });

    return customerService;
};

// Get all customer service requests (Admin) with filter, search, and pagination
const getAllCustomerServiceRequests = async (query: any = {}) => {
    const filter: any = { isDeleted: false };

    if (query.status) {
        filter.status = query.status;
    }

    if (query.issueType) {
        filter.issueType = query.issueType;
    }

    if (query.searchTerm) {
        const searchRegex = new RegExp(query.searchTerm as string, "i");
        filter.$or = [
            { name: searchRegex },
            { email: searchRegex },
            { description: searchRegex },
        ];
    }

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const data = await CustomerServiceModel.find(filter)
        .populate("orderId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await CustomerServiceModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
};

// Get single request by ID
const getCustomerServiceRequestById = async (id: string) => {
    const request = await CustomerServiceModel.findOne({ _id: id, isDeleted: false }).populate("orderId");
    if (!request) {
        throw new ApiError(httpStatus.NOT_FOUND, "Customer service request not found.");
    }
    return request;
};

// Update request status and optional admin notes (Admin)
const updateCustomerServiceRequest = async (
    id: string,
    payload: { status?: string; adminNotes?: string },
) => {
    const updateData: any = {};

    if (payload.status) {
        if (!["pending", "in_progress", "resolved", "rejected"].includes(payload.status)) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                "Invalid status value. Must be pending, in_progress, resolved, or rejected.",
            );
        }
        updateData.status = payload.status;
    }

    if (payload.adminNotes !== undefined) {
        updateData.adminNotes = payload.adminNotes;
    }

    const updatedRequest = await CustomerServiceModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: updateData },
        { returnDocument: "after", runValidators: true },
    );

    if (!updatedRequest) {
        throw new ApiError(httpStatus.NOT_FOUND, "Customer service request not found.");
    }

    // If admin added notes or updated status, send email response to customer in background
    if (payload.adminNotes || payload.status) {
        sendCustomerServiceReplyEmail(updatedRequest.email, updatedRequest.name, {
            _id: updatedRequest._id.toString(),
            issueType: updatedRequest.issueType,
            orderId: updatedRequest.orderId ? updatedRequest.orderId.toString() : undefined,
            status: updatedRequest.status || "pending",
            adminNotes: updatedRequest.adminNotes || "Your request status has been updated.",
        });
    }

    return updatedRequest;
};

// Soft delete customer service request (Admin)
const deleteCustomerServiceRequest = async (id: string) => {
    const deletedRequest = await CustomerServiceModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: { isDeleted: true } },
        { returnDocument: "after" },
    );

    if (!deletedRequest) {
        throw new ApiError(httpStatus.NOT_FOUND, "Customer service request not found.");
    }

    return deletedRequest;
};

export const customerServiceServices = {
    createCustomerServiceRequest,
    getAllCustomerServiceRequests,
    getCustomerServiceRequestById,
    updateCustomerServiceRequest,
    deleteCustomerServiceRequest,
};
