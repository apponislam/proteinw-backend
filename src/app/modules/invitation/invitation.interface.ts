import { Types } from "mongoose";

export type InvitationStatus = "pending" | "accepted" | "declined";

export interface IInvitation {
    _id?: string;
    groupId: Types.ObjectId;
    inviterId: Types.ObjectId;
    email: string;
    status: InvitationStatus;
    createdAt?: Date;
    updatedAt?: Date;
}
