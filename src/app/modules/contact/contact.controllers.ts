import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { Request, Response } from "express";
import { contactServices } from "./contact.services";

const createContact = catchAsync(async (req: Request, res: Response) => {
    const result = await contactServices.createContact(req.body);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Contact message sent successfully",
        data: result,
    });
});

const getAllContacts = catchAsync(async (req: Request, res: Response) => {
    const result = await contactServices.getAllContacts(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Contact messages retrieved successfully",
        data: result.data,
        meta: result.pagination,
    });
});

const getContactById = catchAsync(async (req: Request, res: Response) => {
    const result = await contactServices.getContactById(req.params.contactId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Contact message retrieved successfully",
        data: result,
    });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
    const result = await contactServices.markAsRead(req.params.contactId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Contact message marked as read",
        data: result,
    });
});

const deleteContact = catchAsync(async (req: Request, res: Response) => {
    await contactServices.deleteContact(req.params.contactId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Contact message deleted successfully",
        data: null,
    });
});

export const contactControllers = {
    createContact,
    getAllContacts,
    getContactById,
    markAsRead,
    deleteContact,
};
