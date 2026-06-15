import { Router } from "express";
import { dashboardControllers } from "./dashboard.controllers";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";

const router = Router();

router.get("/stats", auth, dashboardControllers.getDashboardStats);
router.get("/status", auth, dashboardControllers.getDashboardStatus);
router.get("/seller-stats", auth, dashboardControllers.getSellerDashboardStats);
router.get("/superadmin-sellers-stats", auth, authorize(["SUPER_ADMIN"]), dashboardControllers.getSuperAdminSellersStats);
router.get("/store-info", dashboardControllers.getStoreInfo);

export const dashboardRoutes = router;
