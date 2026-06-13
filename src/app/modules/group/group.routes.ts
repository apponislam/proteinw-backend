import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { groupControllers } from "./group.controllers";

const router = Router();

// Public routes
router.get("/", groupControllers.getActiveGroups);
router.get("/code/:code", groupControllers.getGroupByCode);
router.get("/:groupId", groupControllers.getGroupById);

// Admin & Super Admin routes
router.post("/", auth, authorize(["SUPER_ADMIN", "ADMIN"]), groupControllers.createGroup);
router.get("/admin/all", auth, authorize(["SUPER_ADMIN", "ADMIN"]), groupControllers.getAllGroups);
router.patch("/:groupId", auth, authorize(["SUPER_ADMIN", "ADMIN"]), groupControllers.updateGroup);
router.patch("/:groupId/toggle-status", auth, authorize(["SUPER_ADMIN", "ADMIN"]), groupControllers.toggleGroupStatus);
router.delete("/:groupId", auth, authorize(["SUPER_ADMIN", "ADMIN"]), groupControllers.deleteGroup);

export const groupRoutes = router;
