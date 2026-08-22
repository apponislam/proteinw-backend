import { Router } from "express";
import { dashboardControllers } from "./dashboard.controllers";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";

const router = Router();

router.get("/stats", auth, dashboardControllers.getDashboardStats);
router.get("/status", auth, dashboardControllers.getDashboardStatus);
router.get("/seller-stats", auth, dashboardControllers.getSellerDashboardStats);
router.get("/superadmin-sellers-stats", auth, authorize(["SUPER_ADMIN"]), dashboardControllers.getSuperAdminSellersStats);
router.get("/superadmin-sellers", auth, authorize(["SUPER_ADMIN"]), dashboardControllers.getSuperAdminSellers);
router.get("/superadmin-groups-stats", auth, authorize(["SUPER_ADMIN"]), dashboardControllers.getSuperAdminGroupsStats);
router.get("/superadmin-groups-cards", auth, authorize(["SUPER_ADMIN"]), dashboardControllers.getSuperAdminGroupsDashboardCards);
router.get("/superadmin-admins-stats", auth, authorize(["SUPER_ADMIN"]), dashboardControllers.getSuperAdminAdminsStats);
router.get("/total-distributed-profit", auth, authorize(["SUPER_ADMIN", "ADMIN"]), dashboardControllers.getTotalDistributedProfit);
router.get("/active-campaigns-overview", auth, authorize(["SUPER_ADMIN", "ADMIN"]), dashboardControllers.getActiveCampaignsOverview);
router.get("/store-info", dashboardControllers.getStoreInfo);
router.get("/as-seller-stats", auth, dashboardControllers.getAsSellerDashboardStats);
router.get("/as-seller-campaign-info", auth, dashboardControllers.getAsSellerCampaignInfo);

export const dashboardRoutes = router;
