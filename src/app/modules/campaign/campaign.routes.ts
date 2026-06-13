import { Router } from "express";
import { campaignControllers } from "./campaign.controllers";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";

const router = Router();

// Public routes
router.get("/active", campaignControllers.getActiveCampaigns);
router.get("/code/:code", campaignControllers.getCampaignByCode);
router.get("/admin/all", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.getAllCampaignsWithStats);
router.get("/:campaignId", campaignControllers.getCampaignById);

// Protected routes
router.get("/group/:groupId", auth, campaignControllers.getCampaignsByGroup);

// Admin-only routes
router.post("/", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.createCampaign);
router.get("/", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.getAllCampaigns);
router.patch("/:campaignId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.updateCampaign);
router.patch("/:campaignId/toggle-status", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.toggleCampaignStatus);
router.delete("/:campaignId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.deleteCampaign);

export const campaignRoutes = router;
