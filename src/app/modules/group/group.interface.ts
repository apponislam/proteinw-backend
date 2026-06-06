import { Types } from "mongoose";

export interface IGroup {
    _id?: string;

    name: string;
    shortDescription: string;
    goal: string;
    endDate: Date;

    createdBy?: Types.ObjectId;
    isActive: boolean;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
