import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { dashboardServices } from "./dashboard.services";
import ApiError from "../../../errors/ApiError";

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardServices.getDashboardStats();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Instrumentpanelens statistik hämtades framgångsrikt",
        data: result,
    });
});

const getDashboardStatus = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Obehörig åtkomst");
    }

    const result = await dashboardServices.getDashboardStatus(user._id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Instrumentpanelens status kontrollades framgångsrikt",
        data: result,
    });
});

const getStoreInfo = catchAsync(async (req: Request, res: Response) => {
    const campaignCode = req.query.campaign as string;
    const referralCode = req.query.referral as string;

    if (!campaignCode || !referralCode) {
        return sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: "Validering misslyckades - parametrar saknas",
            data: { validation: false },
        });
    }

    const result = await dashboardServices.getStoreInfo(campaignCode, referralCode);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Butiksinformation hämtades framgångsrikt",
        data: result,
    });
});

const getSellerDashboardStats = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as any;
    const campaignId = (req.query.campaignId as string) || (req.query.campaign as string) || undefined;
    const groupId = (req.query.groupId as string) || undefined;
    const result = await dashboardServices.getSellerDashboardStats(campaignId, groupId, user?._id, user?.role);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Säljarens instrumentpanelstatistik hämtades framgångsrikt",
        data: result,
    });
});

const getSuperAdminSellersStats = catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardServices.getSuperAdminSellersStats();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Superadmin säljarstatistik hämtades framgångsrikt",
        data: result,
    });
});

const getSuperAdminSellers = catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardServices.getSuperAdminSellers(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Superadmin säljare hämtades framgångsrikt",
        data: result.data,
        meta: result.pagination,
    });
});

const getSuperAdminGroupsStats = catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardServices.getSuperAdminGroupsStats(req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Superadmin gruppförsäljningsstatistik hämtades framgångsrikt",
        data: result.data,
        meta: result.pagination,
    });
});

const getSuperAdminGroupsDashboardCards = catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardServices.getSuperAdminGroupsDashboardCards();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Superadmin gruppinstrumentpanelskort hämtades framgångsrikt",
        data: result,
    });
});

const getSuperAdminAdminsStats = catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardServices.getSuperAdminAdminsStats();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Superadmin administratörsstatistik hämtades framgångsrikt",
        data: result,
    });
});

const getTotalDistributedProfit = catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardServices.getTotalDistributedProfit();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Total distribuerad vinst hämtades framgångsrikt",
        data: result,
    });
});

const getActiveCampaignsOverview = catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardServices.getActiveCampaignsOverview();

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Översikt över aktiva försäljningar hämtades framgångsrikt",
        data: result,
    });
});

const getAsSellerDashboardStats = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as any;
    const result = await dashboardServices.getAsSellerDashboardStats(user?._id, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Säljarens instrumentpanelstatistik hämtades framgångsrikt",
        data: result,
    });
});

const getAsSellerCampaignInfo = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as any;
    const result = await dashboardServices.getAsSellerCampaignInfo(user?._id, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Säljarens försäljningsinformation hämtades framgångsrikt",
        data: result,
    });
});

const getSellerCampaignInfoById = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as any;
    const campaignId = req.params.campaignId as string;
    const result = await dashboardServices.getSellerCampaignInfoById(user?._id, campaignId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Försäljning hämtades framgångsrikt",
        data: result,
    });
});

export const dashboardControllers = {
    getDashboardStats,
    getDashboardStatus,
    getStoreInfo,
    getSellerDashboardStats,
    getSuperAdminSellersStats,
    getSuperAdminSellers,
    getSuperAdminGroupsStats,
    getSuperAdminGroupsDashboardCards,
    getSuperAdminAdminsStats,
    getTotalDistributedProfit,
    getActiveCampaignsOverview,
    getAsSellerDashboardStats,
    getAsSellerCampaignInfo,
    getSellerCampaignInfoById,
};
