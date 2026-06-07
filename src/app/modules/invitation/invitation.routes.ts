import { Router } from "express";
import { invitationControllers } from "./invitation.controllers";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";

const router = Router();

// Public routes
router.get("/code/:code", invitationControllers.getInvitationByCode);

// Authenticated routes
router.patch("/accept/:code", auth, invitationControllers.acceptInvitation);
router.patch("/decline/:code", auth, invitationControllers.declineInvitation);

// Admin-only routes (ADMIN and SUPER_ADMIN)
router.post("/", auth, authorize(["ADMIN", "SUPER_ADMIN"]), invitationControllers.sendInvitation);
router.get("/group/:groupId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), invitationControllers.getInvitationsByGroup);
router.patch("/cancel/:invitationId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), invitationControllers.cancelInvitation);
router.patch("/resend/:invitationId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), invitationControllers.resendInvitation);

export const invitationRoutes = router;
