import { Types } from "mongoose";

export type TIssueType = "reklamation" | "byte";
export type TCustomerServiceStatus = "pending" | "in_progress" | "resolved" | "rejected";

export interface ICustomerServiceRequest {
    _id?: string;
    issueType: TIssueType;
    orderId?: Types.ObjectId | string;
    name: string;
    email: string;
    phone?: string;
    description: string;
    images?: string[];
    status?: TCustomerServiceStatus;
    adminNotes?: string;
    isDeleted?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}
