import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { InvitationModel } from "./invitation.model";
import { UserModel } from "../auth/auth.model";
import { GroupModel } from "../group/group.model";

const sendInvitation = async (inviterId: string, groupId: string, email: string) => {
    // Check if group exists
    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Group not found");

    // Check if user already exists with this email
    const existingUser = await UserModel.findOne({ email, isDeleted: false });
    if (existingUser) throw new ApiError(httpStatus.BAD_REQUEST, "User already exists with this email");

    // Check if pending invitation already exists for this email and group
    const existingInvitation = await InvitationModel.findOne({
        email,
        groupId,
        status: "pending",
        isDeleted: false,
    });
    if (existingInvitation) throw new ApiError(httpStatus.BAD_REQUEST, "Invitation already sent to this email");

    // Create invitation
    const invitation = await InvitationModel.create({
        groupId: new Types.ObjectId(groupId),
        inviterId: new Types.ObjectId(inviterId),
        email,
    });

    return invitation;
};

const getInvitationsByGroup = async (groupId: string, query: any = {}) => {
    const filter: any = { groupId, isDeleted: false };
    if (query.status) filter.status = query.status;

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const invitations = await InvitationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("inviterId", "name email");

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

const getInvitationByCode = async (code: string) => {
    const invitation = await InvitationModel.findOne({
        code,
        status: "pending",
        isDeleted: false,
        expiresAt: { $gt: new Date() },
    }).populate("groupId", "name");

    if (!invitation) throw new ApiError(httpStatus.NOT_FOUND, "Invitation not found or expired");
    return invitation;
};

const acceptInvitation = async (code: string, userId: string) => {
    const invitation = await getInvitationByCode(code);

    // Update user to assign group and role MEMBER
    await UserModel.findByIdAndUpdate(userId, {
        groupAssigned: invitation.groupId,
        role: "MEMBER",
    });

    // Mark invitation as accepted
    invitation.status = "accepted";
    await invitation.save();

    return { message: "Invitation accepted successfully", groupId: invitation.groupId };
};

const declineInvitation = async (code: string) => {
    const invitation = await getInvitationByCode(code);

    invitation.status = "declined";
    await invitation.save();

    return { message: "Invitation declined successfully" };
};

const cancelInvitation = async (invitationId: string) => {
    const invitation = await InvitationModel.findOne({ _id: invitationId, isDeleted: false });
    if (!invitation) throw new ApiError(httpStatus.NOT_FOUND, "Invitation not found");

    invitation.isDeleted = true;
    await invitation.save();

    return { message: "Invitation canceled successfully" };
};

const resendInvitation = async (invitationId: string) => {
    const invitation = await InvitationModel.findOne({ _id: invitationId, isDeleted: false });
    if (!invitation) throw new ApiError(httpStatus.NOT_FOUND, "Invitation not found");

    if (invitation.status !== "pending") {
        throw new ApiError(httpStatus.BAD_REQUEST, "Cannot resend invitation that is not pending");
    }

    // Regenerate code and reset expiration
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    invitation.code = code;
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await invitation.save();

    return invitation;
};

export const invitationServices = {
    sendInvitation,
    getInvitationsByGroup,
    getInvitationByCode,
    acceptInvitation,
    declineInvitation,
    cancelInvitation,
    resendInvitation,
};
