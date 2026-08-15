import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { campaignSellerControllers } from "./campaignSeller.controllers";

const router = Router();

// Seller routes
router.post("/join", auth, authorize(["SELLER"]), campaignSellerControllers.joinCampaign);
router.get("/my-campaigns", auth, authorize(["SELLER"]), campaignSellerControllers.getMyJoinedCampaigns);

// Admin & Super Admin route to see joined sellers of a campaign
router.get("/campaign/:campaignId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), campaignSellerControllers.getCampaignSellers);

export const campaignSellerRoutes = router;
