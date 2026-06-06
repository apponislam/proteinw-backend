import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { tierControllers } from "./tier.controllers";

const router = Router();

// Public routes
router.get("/", tierControllers.getActiveTiers);
router.get("/:tierId", tierControllers.getTierById);

// Admin-only routes (SUPER_ADMIN only)
router.post("/", auth, authorize(["SUPER_ADMIN"]), tierControllers.createTier);
router.get("/admin/all", auth, authorize(["SUPER_ADMIN"]), tierControllers.getAllTiers);
router.patch("/:tierId", auth, authorize(["SUPER_ADMIN"]), tierControllers.updateTier);
router.patch("/:tierId/toggle-status", auth, authorize(["SUPER_ADMIN"]), tierControllers.toggleTierStatus);
router.delete("/:tierId", auth, authorize(["SUPER_ADMIN"]), tierControllers.deleteTier);

export const tierRoutes = router;
