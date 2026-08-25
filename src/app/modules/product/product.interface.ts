import { Types } from "mongoose";

export interface IProduct {
    _id?: string;

    name: string;
    price: number;
    shortDescription: string;
    category: string;
    subCategory?: string;
    marginBenefit?: string;
    qualityHighlight?: string;
    ecoHighlight?: string;
    productImage?: string;
    createdBy?: Types.ObjectId;
    isActive: boolean;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
