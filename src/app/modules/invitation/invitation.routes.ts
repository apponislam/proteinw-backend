import { Router } from "express";
import { invitationControllers } from "./invitation.controllers";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";

const router = Router();

// Public routes
router.get("/email/:email", invitationControllers.getInvitationByEmail);

// Admin-only routes (ADMIN and SUPER_ADMIN)
router.post("/", auth, authorize(["ADMIN", "SUPER_ADMIN"]), invitationControllers.sendInvitation);
router.get("/group/:groupId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), invitationControllers.getInvitationsByGroup);
router.delete("/:invitationId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), invitationControllers.cancelInvitation);

export const invitationRoutes = router;
