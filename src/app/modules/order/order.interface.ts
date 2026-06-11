import { Types } from "mongoose";

// Interface for individual order item
export interface IOrderItem {
    productId: Types.ObjectId;
    productName: string;
    quantity: number;
    singlePrice: number;
    lineTotal: number;
}

export interface IOrder {
    _id?: string;

    // Guest customer info
    customerName: string;
    customerEmail: string;
    customerPhone?: string;

    // Address info
    address: {
        street: string;
        city: string;
        postalCode: string;
        country: string;
    };

    // Order items
    items: IOrderItem[];
    totalPackage: number;
    totalPrice: number;

    // Association - who's store/member the order is for
    memberId?: Types.ObjectId; // The member sharing the store link
    campaignId?: Types.ObjectId; // The campaign this order is for
    groupId?: Types.ObjectId; // The group associated

    // Order status
    status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
    isDeleted: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}
