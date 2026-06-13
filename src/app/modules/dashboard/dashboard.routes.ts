import { Router } from "express";
import { dashboardControllers } from "./dashboard.controllers";
import auth from "../../middlewares/auth";

const router = Router();

router.get("/stats", auth, dashboardControllers.getDashboardStats);
router.get("/status", auth, dashboardControllers.getDashboardStatus);

export const dashboardRoutes = router;
