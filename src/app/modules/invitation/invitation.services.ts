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

    // Check if pending invitation already exists for this email
    const existingInvitation = await InvitationModel.findOne({
        email,
        status: "pending",
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

    if (!invitation) throw new ApiError(httpStatus.NOT_FOUND, "Invitation not found");
    return invitation;
};

const acceptInvitation = async (email: string) => {
    const invitation = await getInvitationByEmail(email);

    // Mark invitation as accepted
    invitation.status = "accepted";
    await invitation.save();

    return { message: "Invitation accepted successfully", groupId: invitation.groupId };
};

const declineInvitation = async (email: string) => {
    const invitation = await getInvitationByEmail(email);

    invitation.status = "declined";
    await invitation.save();

    return { message: "Invitation declined successfully" };
};

const cancelInvitation = async (invitationId: string) => {
    const invitation = await InvitationModel.findById(invitationId);
    if (!invitation) throw new ApiError(httpStatus.NOT_FOUND, "Invitation not found");

    await InvitationModel.findByIdAndDelete(invitationId);

    return { message: "Invitation canceled successfully" };
};

export const invitationServices = {
    sendInvitation,
    getInvitationsByGroup,
    getInvitationByEmail,
    acceptInvitation,
    declineInvitation,
    cancelInvitation,
};
