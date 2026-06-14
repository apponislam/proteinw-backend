import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { jwtHelper } from "../../../utils/jwtHelper";
import config from "../../config";
import { UserModel } from "./auth.model";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendOtpEmail, sendVerificationEmail, sendWelcomeEmail, sendEmailUpdateVerification, sendAdminCreatedEmail } from "../../../utils/emailTemplates";
import { invitationServices } from "../invitation/invitation.services";
import { CampaignModel } from "../campaign/campaign.model";
import { GroupModel } from "../group/group.model";
import { OrderModel } from "../order/order.model";
import { activityLogServices } from "../activityLog/activityLog.services";
import { Types } from "mongoose";

const registerUser = async (data: any) => {
    // Check existing user
    const existing = await UserModel.findOne({ email: data.email });
    if (existing) throw new ApiError(httpStatus.BAD_REQUEST, "Email already in use");

    // Remove balance and percentage if sent in payload to prevent manual setting
    if (data.balance !== undefined) {
        delete data.balance;
    }
    if (data.percentage !== undefined) {
        delete data.percentage;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, Number(config.bcrypt_salt_rounds));

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create user
    const userData = {
        ...data,
        password: hashedPassword,
        isActive: true,
        isEmailVerified: false,
        balance: 0,
        verificationToken,
        verificationCode,
        verificationExpiry,
    };

    if (userData.role === "TEACHER") {
        userData.teacherApprovalStatus = "PENDING";
    }

    const createdUser = await UserModel.create(userData);

    const verificationUrl = `${config.client_url}/verify-email?token=${verificationToken}&email=${createdUser.email}`;
    sendVerificationEmail(createdUser.email as string, createdUser.name as string, verificationUrl, verificationCode);
    sendWelcomeEmail(createdUser.email as string, createdUser.name as string);

    // Generate tokens
    const jwtPayload = {
        _id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
    };

    const accessToken = jwtHelper.generateToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expire as string);
    const refreshToken = jwtHelper.generateToken(jwtPayload, config.jwt_refresh_secret as string, config.jwt_refresh_expire as string);

    const userObject = createdUser.toObject();
    const { password: pwd, verificationToken: vToken, verificationExpiry: vExpiry, verificationCode: vCode, ...userWithoutSensitive } = userObject;

    return { user: userWithoutSensitive, accessToken, refreshToken };
};

const loginUser = async (data: { email: string; password: string }) => {
    // Find user
    const user = await UserModel.findOne({ email: data.email });
    if (!user) throw new ApiError(httpStatus.UNAUTHORIZED, "User Not Found");

    // Check password
    const isPasswordValid = await bcrypt.compare(data.password, user.password as string);
    if (!isPasswordValid) throw new ApiError(httpStatus.UNAUTHORIZED, "Wrong Password Or Email");

    // Check if active
    if (!user.isActive) throw new ApiError(httpStatus.FORBIDDEN, "Account is deactivated");

    // Check if email verified
    // if (!user.isEmailVerified) {
    //     throw new ApiError(httpStatus.FORBIDDEN, "Please verify your email first");
    // }

    // Update last login
    await UserModel.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

    // Generate tokens
    const jwtPayload = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
    };

    const accessToken = jwtHelper.generateToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expire as string);
    const refreshToken = jwtHelper.generateToken(jwtPayload, config.jwt_refresh_secret as string, config.jwt_refresh_expire as string);

    const { password, ...userWithoutPassword } = user.toObject();

    return { user: userWithoutPassword, accessToken, refreshToken };
};

const verifyEmail = async (email: string, token?: string, otp?: string) => {
    const user = await UserModel.findOne({
        email,
        verificationExpiry: { $gt: new Date() },
    });

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    if (token) {
        if (user.verificationToken !== token) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Verification token is invalid or expired");
        }
    } else if (otp) {
        if (user.verificationCode !== otp) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Verification code (OTP) is invalid or expired");
        }
    } else {
        throw new ApiError(httpStatus.BAD_REQUEST, "Token or OTP is required");
    }

    // Mark email verified
    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationCode = undefined;
    user.verificationExpiry = undefined;
    await user.save();

    return { message: "Email verified successfully" };
};

const resendVerificationEmail = async (email: string) => {
    const user = await UserModel.findOne({ email });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    if (user.isEmailVerified) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Email already verified");
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationToken = verificationToken;
    user.verificationCode = verificationCode;
    user.verificationExpiry = verificationExpiry;
    await user.save();

    // Send verification email
    const verificationUrl = `${config.client_url}/verify-email?token=${verificationToken}&email=${user.email}`;
    sendVerificationEmail(user.email as string, user.name as string, verificationUrl, verificationCode);

    return { message: "Verification email sent" };
};

const getUserById = async (userId: string) => {
    const user = await UserModel.findById(userId).select("-password");
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    return user;
};

const refreshAccessToken = async (refreshToken: string) => {
    if (!refreshToken) throw new ApiError(httpStatus.UNAUTHORIZED, "Refresh token required");

    try {
        const decoded = jwtHelper.verifyToken(refreshToken, config.jwt_refresh_secret as string);

        const user = await UserModel.findById(decoded._id).select("-password");
        if (!user) throw new ApiError(httpStatus.UNAUTHORIZED, "User not found");

        const jwtPayload = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        };

        const accessToken = jwtHelper.generateToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expire as string);

        return { user, accessToken };
    } catch (error) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
    }
};

const requestPasswordReset = async (email: string) => {
    const user = await UserModel.findOne({ email });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiry = otpExpiry;
    await user.save();

    // Send OTP email
    sendOtpEmail(email, otp, user.name as string);

    return { message: "OTP sent" };
};

const verifyOtp = async (email: string, otp: string) => {
    const user = await UserModel.findOne({ email });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    if (!user.resetPasswordOtp || !user.resetPasswordOtpExpiry) {
        throw new ApiError(httpStatus.BAD_REQUEST, "No OTP request found");
    }

    if (user.resetPasswordOtpExpiry < new Date()) {
        throw new ApiError(httpStatus.BAD_REQUEST, "OTP expired");
    }

    if (user.resetPasswordOtp !== otp) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid OTP");
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Clear OTP
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpiry = undefined;

    await user.save();

    return { token: resetToken };
};

const resendOtp = async (email: string) => {
    const user = await UserModel.findOne({ email });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    // Generate new OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiry = otpExpiry;
    await user.save();

    // Send email
    sendOtpEmail(email, otp, user.name as string);

    return { message: "OTP resent" };
};

const resetPassword = async (token: string, newPassword: string) => {
    const user = await UserModel.findOne({
        resetPasswordToken: token,
        resetPasswordTokenExpiry: { $gt: new Date() },
    });

    if (!user) throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired token");

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpiry = undefined;

    await user.save();
};

const updateProfile = async (userId: string, data: any) => {
    // Prevent manual balance and percentage update
    if (data.balance !== undefined) {
        delete data.balance;
    }
    if (data.percentage !== undefined) {
        delete data.percentage;
    }

    const user = await UserModel.findByIdAndUpdate(userId, { $set: data }, { returnDocument: "after", runValidators: true }).select("-password");

    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    return user;
};

const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
    const user = await UserModel.findById(userId);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password as string);
    if (!isPasswordValid) throw new ApiError(httpStatus.BAD_REQUEST, "Current password is incorrect");

    const hashedPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));
    user.password = hashedPassword;
    await user.save();
};

const updateEmail = async (userId: string, newEmail: string, password: string) => {
    const user = await UserModel.findById(userId);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    const isPasswordValid = await bcrypt.compare(password, user.password as string);
    if (!isPasswordValid) throw new ApiError(httpStatus.BAD_REQUEST, "Password is incorrect");

    const existingUser = await UserModel.findOne({ email: newEmail });
    if (existingUser) throw new ApiError(httpStatus.BAD_REQUEST, "Email already in use");

    // Generate verification token for new email
    const verificationToken = crypto.randomBytes(32).toString("hex");

    user.pendingEmail = newEmail;
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await user.save();

    // Send verification email
    const verificationUrl = `${config.client_url}/verify-new-email?token=${verificationToken}&email=${newEmail}`;
    sendEmailUpdateVerification(newEmail, user.name as string, verificationUrl);
};

const resendEmailUpdate = async (userId: string, password: string) => {
    const user = await UserModel.findById(userId);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    if (!user.pendingEmail) {
        throw new ApiError(httpStatus.BAD_REQUEST, "No pending email update");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password as string);
    if (!isPasswordValid) throw new ApiError(httpStatus.BAD_REQUEST, "Password is incorrect");

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpiry = verificationExpiry;
    await user.save();

    // Send verification email
    const verificationUrl = `${config.client_url}/verify-new-email?token=${verificationToken}&email=${user.pendingEmail}`;
    sendEmailUpdateVerification(user.pendingEmail as string, user.name as string, verificationUrl);

    return { message: "Verification email resent" };
};

const verifyNewEmail = async (token: string, email: string) => {
    const user = await UserModel.findOne({
        pendingEmail: email,
        emailVerificationToken: token,
        emailVerificationExpiry: { $gt: new Date() },
    });

    if (!user) throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired token");

    // Update email
    user.email = email;
    user.pendingEmail = undefined;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;

    await user.save();

    return { message: "New email verified successfully" };
};

const setUserPassword = async (userId: string, newPassword: string) => {
    const user = await UserModel.findById(userId);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    const hashedPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));
    user.password = hashedPassword;
    await user.save();
};

const registerSeller = async (data: any) => {
    // Check invitation exists
    const invitation = await invitationServices.getInvitationByEmail(data.email);

    // Check existing user
    const existing = await UserModel.findOne({ email: data.email });
    if (existing) throw new ApiError(httpStatus.BAD_REQUEST, "Email already in use");

    // Find active campaign for the group
    const activeCampaign = await CampaignModel.findOne({
        groupId: invitation.groupId,
        isDeleted: false,
        isActive: true,
        endDate: { $gt: new Date() },
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, Number(config.bcrypt_salt_rounds));

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create user with role SELLER and assigned group & campaign if available
    const userData: any = {
        ...data,
        password: hashedPassword,
        isActive: true,
        isEmailVerified: false,
        role: "SELLER",
        groupAssigned: invitation.groupId,
        verificationToken,
        verificationCode,
        verificationExpiry,
    };

    if (activeCampaign) {
        userData.campaignAssigned = activeCampaign._id;
    }

    const createdUser = await UserModel.create(userData);

    // Mark invitation as accepted
    await invitationServices.acceptInvitation(data.email);

    // Log Activity (New Member Joined)
    try {
        let groupName = "the team";
        const group = await GroupModel.findById(invitation.groupId);
        if (group) {
            groupName = group.name;
        }
        await activityLogServices.createActivityLog({
            groupId: new Types.ObjectId(invitation.groupId),
            type: "MEMBER",
            title: "New Member Joined",
            description: `${createdUser.name} joined the ${groupName} team`,
        });
    } catch (activityError) {
        console.error("Failed to create activity log for member join:", activityError);
    }

    // Send emails
    const verificationUrl = `${config.client_url}/verify-email?token=${verificationToken}&email=${createdUser.email}`;
    sendVerificationEmail(createdUser.email as string, createdUser.name as string, verificationUrl, verificationCode);
    sendWelcomeEmail(createdUser.email as string, createdUser.name as string);

    // Generate tokens
    const jwtPayload = {
        _id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
    };

    const accessToken = jwtHelper.generateToken(jwtPayload, config.jwt_access_secret as string, config.jwt_access_expire as string);
    const refreshToken = jwtHelper.generateToken(jwtPayload, config.jwt_refresh_secret as string, config.jwt_refresh_expire as string);

    const userObject = createdUser.toObject();
    const { password: pwd, verificationToken: vToken, verificationExpiry: vExpiry, verificationCode: vCode, ...userWithoutSensitive } = userObject;

    return { user: userWithoutSensitive, accessToken, refreshToken };
};

const createAdmin = async (data: any) => {
    // Check existing user
    const existing = await UserModel.findOne({ email: data.email });
    if (existing) throw new ApiError(httpStatus.BAD_REQUEST, "Email already in use");

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, Number(config.bcrypt_salt_rounds));

    // Create user with role ADMIN
    const userData = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        role: "ADMIN" as const,
        isActive: true,
        isEmailVerified: true, // Auto-verify admin
    };

    const [createdUser] = await UserModel.create([userData]);

    // Send email with credentials
    sendAdminCreatedEmail(createdUser.email as string, createdUser.name as string, data.password);

    const userObject = createdUser.toObject();
    const { password: pwd, ...userWithoutSensitive } = userObject;

    return userWithoutSensitive;
};

const getAdminsWithStats = async (query: any) => {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const total = await UserModel.countDocuments({ role: "ADMIN", isDeleted: false });
    const admins = await UserModel.find({ role: "ADMIN", isDeleted: false }).sort({ createdAt: -1 }).skip(skip).limit(limit);

    const data = await Promise.all(
        admins.map(async (admin) => {
            const group = await GroupModel.findOne({ createdBy: admin._id, isDeleted: false });
            let groupName = null;
            let sellerCount = 0;
            let orderCount = 0;

            if (group) {
                groupName = group.name;
                sellerCount = await UserModel.countDocuments({ groupAssigned: group._id, role: "SELLER", isDeleted: false });

                if (group.runningCampaignId) {
                    orderCount = await OrderModel.countDocuments({ campaignId: group.runningCampaignId, isDeleted: false });
                }
            }

            return {
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                isActive: admin.isActive,
                groupName,
                sellerCount,
                orderCount,
            };
        }),
    );

    return {
        data,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        },
    };
};

const getGroupSellers = async (groupId: string, query: any = {}) => {
    const filter: any = {
        groupAssigned: new Types.ObjectId(groupId),
        role: "SELLER",
        isDeleted: false,
    };

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const sellers = await UserModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-password -verificationToken -verificationCode -verificationExpiry");
    const total = await UserModel.countDocuments(filter);

    return {
        data: sellers,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        },
    };
};

const getMyReferralAndCampaign = async (userId: string) => {
    // 1. Find user by ID
    const user = await UserModel.findOne({ _id: new Types.ObjectId(userId), isDeleted: false });
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    // 2. Resolve campaign code
    let campaignCode: string | false = false;
    let campaignId = user.campaignAssigned;

    if (!campaignId && user.groupAssigned) {
        const campaign = await CampaignModel.findOne({
            groupId: user.groupAssigned,
            isActive: true,
            isDeleted: false,
        });
        if (campaign) {
            campaignCode = campaign.code;
        }
    } else if (campaignId) {
        const campaign = await CampaignModel.findOne({
            _id: campaignId,
            isActive: true,
            isDeleted: false,
        });
        if (campaign) {
            campaignCode = campaign.code;
        }
    }

    return {
        referralCode: user.referralCode,
        campaignCode: campaignCode || false,
        campaign: campaignCode || false,
    };
};

export const authServices = {
    registerUser,
    loginUser,
    verifyEmail,
    resendVerificationEmail,
    getUserById,
    refreshAccessToken,
    requestPasswordReset,
    verifyOtp,
    resendOtp,
    resetPassword,
    updateProfile,
    changePassword,
    updateEmail,
    resendEmailUpdate,
    verifyNewEmail,
    setUserPassword,
    registerSeller,
    createAdmin,
    getAdminsWithStats,
    getGroupSellers,
    getMyReferralAndCampaign,
};
