import { Router } from "express";
import { campaignProductControllers } from "./campaignProduct.controllers";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";

const router = Router();

// Super Admin only routes
router.post("/campaign/:campaignId/product/:productId", auth, authorize(["SUPER_ADMIN"]), campaignProductControllers.addProductToCampaign);
router.post("/campaign/:campaignId/products", auth, authorize(["SUPER_ADMIN"]), campaignProductControllers.addMultipleProductsToCampaign);
router.delete("/campaign/:campaignId/product/:productId", auth, authorize(["SUPER_ADMIN"]), campaignProductControllers.removeProductFromCampaign);
router.delete("/campaign/:campaignId/products", auth, authorize(["SUPER_ADMIN"]), campaignProductControllers.removeMultipleProductsFromCampaign);

// Public/Protected routes (can be accessed by others if needed)
router.get("/my-campaign/products", auth, campaignProductControllers.getMyCampaignProducts);
router.get("/campaign/:campaignId/products", campaignProductControllers.getProductsByCampaign);
router.get("/campaign/code/:code/products/count", campaignProductControllers.getProductCountByCampaignCode);
router.get("/campaign/code/:code/products", campaignProductControllers.getProductsByCampaignCode);
router.get("/product/:productId/campaigns", campaignProductControllers.getCampaignsByProduct);

export const campaignProductRoutes = router;
