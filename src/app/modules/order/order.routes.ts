import { Router } from "express";
import { orderControllers } from "./order.controllers";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";

const router = Router();

// Public route - no auth required for placing guest orders
router.post("/", orderControllers.createOrder);

// Protected routes
router.get("/member", auth, orderControllers.getOrdersByMember);
router.get("/:orderId", auth, orderControllers.getOrderById);

// Admin/Super Admin routes
router.get("/", auth, authorize(["ADMIN", "SUPER_ADMIN"]), orderControllers.getAllOrders);
router.patch("/:orderId/status", auth, authorize(["ADMIN", "SUPER_ADMIN"]), orderControllers.updateOrderStatus);
router.delete("/:orderId", auth, authorize(["ADMIN", "SUPER_ADMIN"]), orderControllers.deleteOrder);

export const orderRoutes = router;
