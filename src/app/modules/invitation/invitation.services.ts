import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { InvitationModel } from "./invitation.model";
import { UserModel } from "../auth/auth.model";
import { GroupModel } from "../group/group.model";
import { sendGroupInvitationEmail } from "../../../utils/emailTemplates";

const sendInvitation = async (inviterId: string, groupId: string, email: string) => {
    // Check if group exists
    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Target group was not found or has been deleted.");

    // Check if user exists with this email and is an Admin or Super Admin
    const existingUser = await UserModel.findOne({ email, isDeleted: false });
    if (existingUser && ["ADMIN", "SUPER_ADMIN"].includes(existingUser.role)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "This email address belongs to an administrative account and cannot be invited as a seller.");
    }

    // Check if pending invitation already exists for this email
    const existingInvitation = await InvitationModel.findOne({
        email,
        status: "pending",
    });
    if (existingInvitation) throw new ApiError(httpStatus.BAD_REQUEST, "A pending invitation has already been sent to this email address.");

    // Create invitation
    const invitation = await InvitationModel.create({
        groupId: new Types.ObjectId(groupId),
        inviterId: new Types.ObjectId(inviterId),
        email,
    });

    // Send invitation email with code
    sendGroupInvitationEmail(email, group.name, invitation.code as string);

    return invitation;
};

const getInvitationsByGroup = async (groupId: string, query: any = {}) => {
    const filter: any = { groupId };
    if (query.status) filter.status = query.status;

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const invitations = await InvitationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("inviterId", "name email");

    const total = await InvitationModel.countDocuments(filter);

    return {
        data: invitations,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        },
    };
};

const getInvitationByEmail = async (email: string) => {
    const invitation = await InvitationModel.findOne({
        email,
        status: "pending",
    }).populate("groupId", "name");

    if (!invitation) throw new ApiError(httpStatus.NOT_FOUND, "No pending invitation was found for this email address.");
    return invitation;
};

const acceptInvitation = async (email: string) => {
    const invitation = await getInvitationByEmail(email);

    // Delete the invitation
    await InvitationModel.findByIdAndDelete(invitation._id);

    return { message: "Invitation accepted successfully", groupId: invitation.groupId };
};

const declineInvitation = async (email: string) => {
    const invitation = await getInvitationByEmail(email);

    // Delete the invitation
    await InvitationModel.findByIdAndDelete(invitation._id);

    return { message: "Invitation declined successfully" };
};

const cancelInvitation = async (invitationId: string) => {
    const invitation = await InvitationModel.findById(invitationId);
    if (!invitation) throw new ApiError(httpStatus.NOT_FOUND, "Requested invitation was not found or has already been canceled.");

    await InvitationModel.findByIdAndDelete(invitationId);

    return { message: "Invitation canceled successfully" };
};

const getInvitationByCode = async (code: string) => {
    const invitation = await InvitationModel.findOne({
        code,
        status: "pending",
    }).populate("groupId", "name");

    if (!invitation) throw new ApiError(httpStatus.NOT_FOUND, `No pending invitation was found with code "${code}".`);
    return invitation;
};

export const invitationServices = {
    sendInvitation,
    getInvitationsByGroup,
    getInvitationByEmail,
    getInvitationByCode,
    acceptInvitation,
    declineInvitation,
    cancelInvitation,
};
