export interface IContactUs {
    _id?: string;

    name: string;
    email: string;
    subject: string;
    phone?: string;
    message: string;
    isRead: boolean;
    isDeleted: boolean;

    createdAt?: Date;
    updatedAt?: Date;
}
