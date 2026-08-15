import { Types } from "mongoose";

export interface ISellerGroup {
    sellerId: Types.ObjectId;
    groupId: Types.ObjectId;
    joinedAt?: Date;
    isDeleted?: boolean;
}
