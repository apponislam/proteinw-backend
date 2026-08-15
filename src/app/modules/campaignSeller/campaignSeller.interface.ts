import { Types } from "mongoose";

export interface ICampaignSeller {
    sellerId: Types.ObjectId;
    campaignId: Types.ObjectId;
    joinedAt?: Date;
    isDeleted?: boolean;
}
