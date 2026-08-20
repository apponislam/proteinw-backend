import { Router } from "express";
import { campaignControllers } from "./campaign.controllers";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";

const router = Router();

// Public routes
router.get("/active", campaignControllers.getActiveCampaigns);
router.get("/code/:code", campaignControllers.getCampaignByCode);
router.get("/admin/all", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.getAllCampaignsWithStats);
// Static routes (must be placed before parameterized /:campaignId route)
router.get("/my-campaigns", auth, authorize(["ADMIN"]), campaignControllers.getMyCampaigns);
router.get("/:campaignId", campaignControllers.getCampaignById);
router.get("/seller/running-campaign/:groupId", auth, campaignControllers.getRunningCampaignForSeller);
router.get("/group/:groupId", auth, campaignControllers.getCampaignsByGroup);
router.get("/running-campaign/:groupId", auth, campaignControllers.getRunningCampaignByGroup);

// Admin-only routes
router.post("/", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.createCampaign);
router.get("/admin/summary", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.getAllCampaignsSummary);
router.patch("/:campaignId/assign-tier", auth, authorize(["SUPER_ADMIN"]), campaignControllers.assignTierToCampaign);
router.get("/", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.getAllCampaigns);
router.patch("/:campaignId/status", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.updateCampaignStatus);
router.patch("/:campaignId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.updateCampaign);
router.delete("/:campaignId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignControllers.deleteCampaign);

export const campaignRoutes = router;
