import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { Request, Response } from "express";
import { contactServices } from "./contact.services";
import { getSocket } from "../../socket/socket";

const createContact = catchAsync(async (req: Request, res: Response) => {
    const result = await contactServices.createContact(req.body);

    // Emit socket events only to SUPER_ADMINs
    const io = getSocket();
    io.to("super_admins").emit("contact:new", result);
    const unreadCount = await contactServices.getUnreadCount();
    io.to("super_admins").emit("contact:unreadCount", unreadCount);

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

    // Emit socket events only to SUPER_ADMINs
    const io = getSocket();
    io.to("super_admins").emit("contact:read", result);
    const unreadCount = await contactServices.getUnreadCount();
    io.to("super_admins").emit("contact:unreadCount", unreadCount);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Contact message marked as read",
        data: result,
    });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
    const result = await contactServices.markAllAsRead();

    // Emit socket events only to SUPER_ADMINs
    const io = getSocket();
    io.to("super_admins").emit("contact:allRead", result);
    const unreadCount = await contactServices.getUnreadCount();
    io.to("super_admins").emit("contact:unreadCount", unreadCount);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "All contact messages marked as read",
        data: result,
    });
});

const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
    const result = await contactServices.getUnreadCount();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Unread count retrieved successfully",
        data: result,
    });
});

const deleteContact = catchAsync(async (req: Request, res: Response) => {
    await contactServices.deleteContact(req.params.contactId as string);

    // Emit socket events only to SUPER_ADMINs
    const io = getSocket();
    io.to("super_admins").emit("contact:deleted", { contactId: req.params.contactId });
    const unreadCount = await contactServices.getUnreadCount();
    io.to("super_admins").emit("contact:unreadCount", unreadCount);

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
    markAllAsRead,
    getUnreadCount,
    deleteContact,
};
