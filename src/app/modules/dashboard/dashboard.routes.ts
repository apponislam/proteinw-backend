import { Router } from "express";
import { dashboardControllers } from "./dashboard.controllers";
import auth from "../../middlewares/auth";

const router = Router();

router.get("/stats", auth, dashboardControllers.getDashboardStats);

export const dashboardRoutes = router;
