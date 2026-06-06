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
    language?: string;
    aboutme?: string;
    profession?: UserProfession;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
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
