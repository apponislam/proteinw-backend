import { Types } from "mongoose";

export type CampaignStatus = "DRAFT" | "ACTIVE" | "FULFILMENT" | "COMPLETED";

export interface ICampaign {
    _id?: string;
    name: string;
    shortDescription: string;
    target: number;
    endDate: Date;
    code: string;
    groupId?: Types.ObjectId;
    createdBy?: Types.ObjectId;
    tierId?: Types.ObjectId;
    tierAssignDate?: Date;
    status: CampaignStatus;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
