import express from "express";
import { activityLogControllers } from "./activityLog.controllers";
import auth from "../../middlewares/auth";

const router = express.Router();

router.get("/", auth, activityLogControllers.getAllActivities);

export const activityLogRoutes = router;
