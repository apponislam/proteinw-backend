import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import config from "../../config";
import { Request, Response } from "express";
import { authServices } from "./auth.services";
import { getSocket } from "../../socket/socket";

const register = catchAsync(async (req: Request, res: Response) => {
    console.log(req.body);

    // Handle profile image if uploaded
    let profileImageUrl = undefined;
    if (req.file) {
        profileImageUrl = `/uploads/profile-images/${req.file.filename}`;
    }

    // Parse the body field if it's a string
    let data: any = {};
    if (req.body.body && typeof req.body.body === "string") {
        data = JSON.parse(req.body.body);
    }

    let addressData = data.address || req.body.address;
    if (typeof addressData === "string") {
        try {
            addressData = JSON.parse(addressData);
        } catch {}
    }

    // Parse JSON fields
    const userData: any = {
        name: data.name || req.body.name,
        email: data.email || req.body.email,
        password: data.password || req.body.password,
        role: data.role || req.body.role,
        phone: data.phone || req.body.phone,
        ...(profileImageUrl && { profileImage: profileImageUrl }),
        ...(data.profession && { profession: data.profession }),
        ...(addressData && { address: addressData }),
        ...(data.goal && { goal: data.goal }),
        ...(data.salesStartDate && { salesStartDate: data.salesStartDate }),
        ...(data.salesEndDate && { salesEndDate: data.salesEndDate }),
    };

    // Basic validation
    if (!userData.name || !userData.email || !userData.password) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Namn, e-postadress och lösenord krävs");
    }

    // Location is already parsed
    if (data.location) userData.location = data.location;

    const result = await authServices.registerUser(userData);

    // Previous code:
    // res.cookie("refreshToken", result.refreshToken, {
    //     httpOnly: true,
    //     secure: config.node_env === "production",
    //     sameSite: "strict",
    //     maxAge: 30 * 24 * 60 * 60 * 1000,
    // });

    // New code:
    res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: config.node_env === "production",
        sameSite: config.node_env === "production" ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Användaren registrerades framgångsrikt",
        data: {
            user: result.user,
            accessToken: result.accessToken,
        },
    });
});

const login = catchAsync(async (req: Request, res: Response) => {
    const result = await authServices.loginUser(req.body);

    // Previous code:
    // res.cookie("refreshToken", result.refreshToken, {
    //     httpOnly: true,
    //     secure: config.node_env === "production",
    //     sameSite: "strict",
    //     maxAge: 30 * 24 * 60 * 60 * 1000,
    // });

    // New code:
    res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: config.node_env === "production",
        sameSite: config.node_env === "production" ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Inloggningen lyckades",
        data: {
            user: result.user,
            accessToken: result.accessToken,
        },
    });
});

const loginWithInvitationCode = catchAsync(async (req: Request, res: Response) => {
    const result = await authServices.loginWithInvitationCode(req.body);

    // Previous code:
    // res.cookie("refreshToken", result.refreshToken, {
    //     httpOnly: true,
    //     secure: config.node_env === "production",
    //     sameSite: "strict",
    //     maxAge: 30 * 24 * 60 * 60 * 1000,
    // });

    // New code:
    res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: config.node_env === "production",
        sameSite: config.node_env === "production" ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Inloggad och gick med i gruppen framgångsrikt",
        data: {
            user: result.user,
            accessToken: result.accessToken,
        },
    });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
    const token = req.query.token as string | undefined;
    const otp = req.query.otp as string | undefined;
    const email = req.query.email as string;

    if (!email) {
        throw new ApiError(httpStatus.BAD_REQUEST, "E-postadress krävs");
    }

    const result = await authServices.verifyEmail(email, token, otp);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

const resendVerificationEmail = catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;
    await authServices.resendVerificationEmail(email);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Verifieringsmeddelande skickades igen framgångsrikt",
        data: null,
    });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
    const user = await authServices.getUserById(req.user._id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Användaren hämtades framgångsrikt",
        data: user,
    });
});

const logout = catchAsync(async (req: Request, res: Response) => {
    // Previous code:
    // res.clearCookie("refreshToken");

    // New code:
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: config.node_env === "production",
        sameSite: config.node_env === "production" ? "none" : "lax",
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Utloggningen lyckades",
        data: null,
    });
});

const refreshAccessToken = catchAsync(async (req: Request, res: Response) => {
    // Previous code:
    // const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    // New code:
    const refreshToken = req?.cookies?.refreshToken || req?.body?.refreshToken || (req?.headers?.["x-refresh-token"] as string);

    if (!refreshToken) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Refresh-token saknas eller har gått ut. Logga in igen.");
    }

    const result = await authServices.refreshAccessToken(refreshToken);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Token förnyades framgångsrikt",
        data: result,
    });
});

const requestPasswordReset = catchAsync(async (req: Request, res: Response) => {
    await authServices.requestPasswordReset(req.body.email);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "OTP för återställning av lösenord skickades till e-postadressen",
        data: null,
    });
});

const verifyOtp = catchAsync(async (req: Request, res: Response) => {
    const result = await authServices.verifyOtp(req.body.email, req.body.otp);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "OTP verifierades framgångsrikt",
        data: { token: result.token },
    });
});

const resendOtp = catchAsync(async (req: Request, res: Response) => {
    await authServices.resendOtp(req.body.email);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "OTP skickades igen framgångsrikt",
        data: null,
    });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
    const token = (req.query.token as string) || req.body.token;
    await authServices.resetPassword(token, req.body.newPassword);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Lösenordet återställdes framgångsrikt",
        data: null,
    });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
    // Handle profile image if uploaded
    let profileImageUrl = undefined;
    if (req.file) {
        profileImageUrl = `/uploads/profile-images/${req.file.filename}`;
    }

    // Parse the body field if it's a string (standard for multipart/form-data)

    console.log("req.body", req.body);
    console.log("req.body.body", req.body.body);

    let data: any = {};
    if (req.body.body && typeof req.body.body === "string") {
        try {
            data = JSON.parse(req.body.body);
        } catch (error) {
            // Fallback for cases where the body might be partially formatted
            try {
                const bodyStr = `{${req.body.body}}`;
                data = JSON.parse(bodyStr);
            } catch (innerError) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Invalid JSON in request body");
            }
        }
    } else {
        data = req.body;
    }

    // Parse address if it comes as a JSON string
    let parsedAddress = data.address;
    if (typeof parsedAddress === "string") {
        try {
            parsedAddress = JSON.parse(parsedAddress);
        } catch {
            // Keep original if not JSON
        }
    }

    // Construct update data based on the provided fields
    const updateData: any = {
        ...(data.name && { name: data.name }),
        ...(data.phone && { phone: data.phone }),
        ...(profileImageUrl && { profileImage: profileImageUrl }),
        ...(parsedAddress && { address: parsedAddress }),
        ...(data.profession && { profession: data.profession }),
        ...(data.goal && { goal: data.goal }),
        ...(data.salesStartDate && { salesStartDate: data.salesStartDate }),
        ...(data.salesEndDate && { salesEndDate: data.salesEndDate }),
    };

    const updatedUser = await authServices.updateProfile(req.user._id, updateData);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Profilen uppdaterades framgångsrikt",
        data: updatedUser,
    });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
    await authServices.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Lösenordet ändrades framgångsrikt",
        data: null,
    });
});

const deleteAccount = catchAsync(async (req: Request, res: Response) => {
    const { password } = req.body;
    if (!password) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Lösenord krävs för att radera kontot");
    }

    await authServices.deleteAccount(req.user._id, password);

    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: config.node_env === "production",
        sameSite: config.node_env === "production" ? "none" : "lax",
    });

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Kontot raderades framgångsrikt",
        data: null,
    });
});

const updateEmail = catchAsync(async (req: Request, res: Response) => {
    await authServices.updateEmail(req.user._id, req.body.email, req.body.password);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "E-postuppdatering begärd. Vänligen verifiera den nya e-postadressen.",
        data: null,
    });
});

const resendEmailUpdate = catchAsync(async (req: Request, res: Response) => {
    await authServices.resendEmailUpdate(req.user._id, req.body.password);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "E-postverifiering skickades igen framgångsrikt",
        data: null,
    });
});

const verifyNewEmail = catchAsync(async (req: Request, res: Response) => {
    const { token, email } = req.query;
    await authServices.verifyNewEmail(token as string, email as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Ny e-postadress verifierades framgångsrikt",
        data: null,
    });
});

const setUserPassword = catchAsync(async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const { password } = req.body;
    await authServices.setUserPassword(userId, password);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Lösenordet angavs framgångsrikt",
        data: null,
    });
});

const registerSeller = catchAsync(async (req: Request, res: Response) => {
    // Handle profile image if uploaded
    let profileImageUrl = undefined;
    if (req.file) {
        profileImageUrl = `/uploads/profile-images/${req.file.filename}`;
    }

    // Parse the body field if it's a string
    let data: any = {};
    if (req.body.body && typeof req.body.body === "string") {
        data = JSON.parse(req.body.body);
    }

    // Extract code
    const code = data.code || req.body.code || (req.query.code as string);

    let addressData = data.address || req.body.address;
    if (typeof addressData === "string") {
        try {
            addressData = JSON.parse(addressData);
        } catch {}
    }

    // Parse JSON fields
    const userData: any = {
        code,
        name: data.name || req.body.name,
        email: data.email || req.body.email,
        password: data.password || req.body.password,
        phone: data.phone || req.body.phone,
        ...(profileImageUrl && { profileImage: profileImageUrl }),
        ...(data.profession && { profession: data.profession }),
        ...(addressData && { address: addressData }),
        ...(data.goal && { goal: data.goal }),
        ...(data.salesStartDate && { salesStartDate: data.salesStartDate }),
        ...(data.salesEndDate && { salesEndDate: data.salesEndDate }),
    };

    // Basic validation
    if (!userData.name || !userData.email || !userData.password) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Namn, e-postadress och lösenord krävs");
    }

    const result = await authServices.registerSeller(userData);

    res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: config.node_env === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Säljaren registrerades framgångsrikt",
        data: {
            user: result.user,
            accessToken: result.accessToken,
        },
    });
});

const createAdmin = catchAsync(async (req: Request, res: Response) => {
    if (!req.body.name || !req.body.email || !req.body.password) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Namn, e-postadress och lösenord krävs");
    }

    const result = await authServices.createAdmin(req.body, req.user._id);

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Admin skapades framgångsrikt",
        data: result,
    });
});

const getAdminsWithStats = catchAsync(async (req: Request, res: Response) => {
    const result = await authServices.getAdminsWithStats(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Adminstatistik hämtades framgångsrikt",
        data: result.data,
        meta: result.meta,
    });
});

const getGroupSellers = catchAsync(async (req: Request, res: Response) => {
    const result = await authServices.getGroupSellers(req.params.groupId as string, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Gruppsäljare hämtades framgångsrikt",
        data: result.data,
        meta: result.pagination,
    });
});

const getMyReferralAndCampaign = catchAsync(async (req: Request, res: Response) => {
    const result = await authServices.getMyReferralAndCampaign(req.user._id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Värvnings- och försäljningskod hämtades framgångsrikt",
        data: result,
    });
});

const approveAdmin = catchAsync(async (req: Request, res: Response) => {
    const adminId = (req.params.adminId || req.body.adminId) as string;
    const result = await authServices.approveAdmin(adminId, req.user._id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Admin godkändes framgångsrikt",
        data: result,
    });
});

const updateUserBySuperAdmin = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;

    let updateData: any = {};
    if (req.body.body && typeof req.body.body === "string") {
        updateData = JSON.parse(req.body.body);
    } else {
        updateData = { ...req.body };
    }

    if (req.file) {
        updateData.profileImage = `/uploads/profile-images/${req.file.filename}`;
    }

    if (typeof updateData.address === "string") {
        try {
            updateData.address = JSON.parse(updateData.address);
        } catch {
            // Keep original if not JSON
        }
    }

    const result = await authServices.updateUserBySuperAdmin(userId as string, updateData);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Användaren uppdaterades framgångsrikt",
        data: result,
    });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const user = await authServices.getUserById(userId as string);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Användaren hämtades framgångsrikt",
        data: user,
    });
});

export const authControllers = {
    register,
    login,
    loginWithInvitationCode,
    verifyEmail,
    resendVerificationEmail,
    getMe,
    getUserById,
    logout,
    refreshAccessToken,
    requestPasswordReset,
    verifyOtp,
    resendOtp,
    resetPassword,
    updateProfile,
    changePassword,
    deleteAccount,
    updateEmail,
    resendEmailUpdate,
    verifyNewEmail,
    setUserPassword,
    registerSeller,
    createAdmin,
    approveAdmin,
    getAdminsWithStats,
    getGroupSellers,
    getMyReferralAndCampaign,
    updateUserBySuperAdmin,
};
