import { Types } from "mongoose";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "MEMBER";
export type UserProfession = "LEADER" | "TEACHER" | "PARENT" | "COACH";

export interface User {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
    profileImage?: string;
    profession?: UserProfession;
    address?: {
        organizationName?: string;
        organizationType?: string;
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
    goal?: number;
    salesStartDate?: Date;
    salesEndDate?: Date;
    isActive: boolean;
    isEmailVerified: boolean;
    isDeleted: boolean;
    lastLogin?: Date;

    groupAssigned?: Types.ObjectId;
    campaignAssigned?: Types.ObjectId;

    // Referral fields
    referralCode: string;
    referredBy?: Types.ObjectId;

    // Password reset fields
    resetPasswordOtp?: string;
    resetPasswordOtpExpiry?: Date;
    resetPasswordToken?: string;
    resetPasswordTokenExpiry?: Date;

    // Email verification fields
    verificationToken?: string;
    verificationCode?: string;
    verificationExpiry?: Date;

    // Email update fields
    pendingEmail?: string;
    emailVerificationToken?: string;
    emailVerificationExpiry?: Date;

    createdAt: Date;
    updatedAt: Date;
}
