import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { ContactModel } from "./contact.model";

// Create new contact message
const createContact = async (payload: any) => {
    const contact = await ContactModel.create(payload);
    return contact;
};

// Get all contact messages (admin) with pagination
const getAllContacts = async (query: any = {}) => {
    const filter: any = { isDeleted: false };
    if (query.isRead !== undefined) filter.isRead = query.isRead === "true";

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const contacts = await ContactModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await ContactModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    return {
        data: contacts,
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

// Get single contact message by id
const getContactById = async (contactId: string) => {
    const contact = await ContactModel.findOne({ _id: contactId, isDeleted: false });
    if (!contact) throw new ApiError(httpStatus.NOT_FOUND, "Contact message not found");
    return contact;
};

// Mark contact as read
const markAsRead = async (contactId: string) => {
    const contact = await ContactModel.findOneAndUpdate({ _id: contactId, isDeleted: false }, { $set: { isRead: true } }, { returnDocument: "after", runValidators: true });
    if (!contact) throw new ApiError(httpStatus.NOT_FOUND, "Contact message not found");
    return contact;
};

// Soft delete contact message
const deleteContact = async (contactId: string) => {
    const contact = await ContactModel.findOneAndUpdate({ _id: contactId, isDeleted: false }, { $set: { isDeleted: true } }, { returnDocument: "after" });
    if (!contact) throw new ApiError(httpStatus.NOT_FOUND, "Contact message not found");
    return contact;
};

export const contactServices = {
    createContact,
    getAllContacts,
    getContactById,
    markAsRead,
    deleteContact,
};
