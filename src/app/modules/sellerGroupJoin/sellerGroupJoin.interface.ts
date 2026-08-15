import { Types } from "mongoose";

export interface ISellerGroupJoin {
    sellerId: Types.ObjectId;
    groupId: Types.ObjectId;
    joinedAt?: Date;
    isDeleted?: boolean;
}
