import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { sellerGroupJoinControllers } from "./sellerGroupJoin.controllers";

const router = Router();

// Seller routes
router.post("/join", auth, authorize(["SELLER"]), sellerGroupJoinControllers.joinGroup);
router.get("/my-groups", auth, authorize(["SELLER"]), sellerGroupJoinControllers.getMyJoinedGroups);

// Admin & Super Admin route to see joined sellers of a group
router.get("/group/:groupId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), sellerGroupJoinControllers.getGroupSellers);

export const sellerGroupJoinRoutes = router;
