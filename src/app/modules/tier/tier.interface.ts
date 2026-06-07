import { Types } from "mongoose";

export interface ITier {
    _id?: string;

    name: string;
    percentage: number;
    minSalesVolume: number;
    maxSalesVolume?: number;
    isPopular?: boolean;
    createdBy?: Types.ObjectId;
    isActive: boolean;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
