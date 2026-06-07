import { Types } from "mongoose";

export interface IGroup {
    _id?: string;

    name: string;
    shortDescription: string;
    goal: number;
    endDate: Date;
    code: string;

    runningCampaignId?: Types.ObjectId;
    createdBy?: Types.ObjectId;
    isActive: boolean;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
