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
router.get("/seller/running-campaign/:groupId", auth, campaignControllers.getRunningCampaignForSeller);
router.get("/group/:groupId", auth, campaignControllers.getCampaignsByGroup);
router.get("/running-campaign/:groupId", auth, campaignControllers.getRunningCampaignByGroup);

// Admin-only routes
router.post("/", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.createCampaign);
router.patch("/:campaignId/assign-tier", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.assignTierToCampaign);
router.get("/", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.getAllCampaigns);
router.patch("/:campaignId/status", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.updateCampaignStatus);
router.patch("/:campaignId/toggle-status", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.toggleCampaignStatus);
router.patch("/:campaignId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.updateCampaign);
router.delete("/:campaignId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.deleteCampaign);

export const campaignRoutes = router;
