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
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Målgruppen hittades inte eller har raderats.");

    // Check if user exists with this email and is an Admin or Super Admin
    const existingUser = await UserModel.findOne({ email, isDeleted: false });
    if (existingUser && ["ADMIN", "SUPER_ADMIN"].includes(existingUser.role)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Denna e-postadress tillhör ett administrativt konto och kan inte bjudas in som säljare.");
    }

    // Check if pending invitation already exists for this email
    const existingInvitation = await InvitationModel.findOne({
        email,
        status: "pending",
    });
    if (existingInvitation) throw new ApiError(httpStatus.BAD_REQUEST, "En väntande inbjudan har redan skickats till denna e-postadress.");

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

    if (!invitation) throw new ApiError(httpStatus.NOT_FOUND, "Ingen väntande inbjudan hittades för denna e-postadress.");
    return invitation;
};

const acceptInvitation = async (email: string) => {
    const invitation = await getInvitationByEmail(email);

    // Delete the invitation
    await InvitationModel.findByIdAndDelete(invitation._id);

    return { message: "Inbjudan accepterades framgångsrikt.", groupId: invitation.groupId };
};

const declineInvitation = async (email: string) => {
    const invitation = await getInvitationByEmail(email);

    // Delete the invitation
    await InvitationModel.findByIdAndDelete(invitation._id);

    return { message: "Inbjudan avböjdes framgångsrikt." };
};

const cancelInvitation = async (invitationId: string) => {
    const invitation = await InvitationModel.findById(invitationId);
    if (!invitation) throw new ApiError(httpStatus.NOT_FOUND, "Begärd inbjudan hittades inte eller har redan avbrutits.");

    await InvitationModel.findByIdAndDelete(invitationId);

    return { message: "Inbjudan avbröts framgångsrikt." };
};

const getInvitationByCode = async (code: string) => {
    const invitation = await InvitationModel.findOne({
        code,
        status: "pending",
    }).populate("groupId", "name");

    if (!invitation) throw new ApiError(httpStatus.NOT_FOUND, `Ingen väntande inbjudan hittades med koden "${code}".`);
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
