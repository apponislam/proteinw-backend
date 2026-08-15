import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { sellerGroupControllers } from "./sellerGroup.controllers";

const router = Router();

// Seller routes
router.post("/join", auth, authorize(["SELLER"]), sellerGroupControllers.joinGroup);
router.post("/join-code", auth, authorize(["SELLER"]), sellerGroupControllers.joinGroupByInvitationCode);
router.get("/my-groups", auth, authorize(["SELLER"]), sellerGroupControllers.getMyJoinedGroups);

// Admin & Super Admin route to see joined sellers of a group
router.get("/group/:groupId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), sellerGroupControllers.getGroupSellers);

export const sellerGroupRoutes = router;
