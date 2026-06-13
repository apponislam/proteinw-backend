import express from "express";
import { activityLogControllers } from "./activityLog.controllers";

const router = express.Router();

router.get("/", activityLogControllers.getAllActivities);

export const activityLogRoutes = router;
