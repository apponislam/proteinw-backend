import { Types } from "mongoose";

export interface ICampaign {
    _id?: string;

    name: string;
    shortDescription: string;
    target: number;
    endDate: Date;
    code: string;

    groupId?: Types.ObjectId;
    createdBy?: Types.ObjectId;
    isActive: boolean;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
