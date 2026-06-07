import { Types } from "mongoose";

export interface ICampaignProduct {
    _id?: string;
    campaignId: Types.ObjectId;
    productId: Types.ObjectId;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
