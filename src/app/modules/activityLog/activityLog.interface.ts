import { Types } from "mongoose";

export interface IActivityLog {
    _id?: Types.ObjectId;
    groupId: Types.ObjectId;
    type: "SALE" | "MILESTONE" | "MEMBER" | "CAMPAIGN";
    title: string;
    description: string;
    createdAt?: Date;
    updatedAt?: Date;
}
