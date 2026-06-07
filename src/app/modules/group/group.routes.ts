import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { groupControllers } from "./group.controllers";

const router = Router();

// Public routes
router.get("/", groupControllers.getActiveGroups);
router.get("/code/:code", groupControllers.getGroupByCode);
router.get("/:groupId", groupControllers.getGroupById);

// Admin-only routes (SUPER_ADMIN)
router.post("/", auth, authorize(["SUPER_ADMIN"]), groupControllers.createGroup);
router.get("/admin/all", auth, authorize(["SUPER_ADMIN"]), groupControllers.getAllGroups);
router.patch("/:groupId", auth, authorize(["SUPER_ADMIN"]), groupControllers.updateGroup);
router.patch("/:groupId/toggle-status", auth, authorize(["SUPER_ADMIN"]), groupControllers.toggleGroupStatus);
router.delete("/:groupId", auth, authorize(["SUPER_ADMIN"]), groupControllers.deleteGroup);

export const groupRoutes = router;
