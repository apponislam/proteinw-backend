import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { uploadCustomerServiceImages } from "../../middlewares/multer";
import { customerServiceControllers } from "./customerService.controllers";

const router = Router();

// Public route: Submit a customer service request (reklamation or byte) with optional image uploads
router.post("/", uploadCustomerServiceImages, customerServiceControllers.createCustomerServiceRequest);

// Admin-only routes
router.get("/", auth, authorize(["SUPER_ADMIN"]), customerServiceControllers.getAllCustomerServiceRequests);
router.get("/:id", auth, authorize(["SUPER_ADMIN"]), customerServiceControllers.getCustomerServiceRequestById);
router.patch("/:id", auth, authorize(["SUPER_ADMIN"]), customerServiceControllers.updateCustomerServiceRequest);
router.delete("/:id", auth, authorize(["SUPER_ADMIN"]), customerServiceControllers.deleteCustomerServiceRequest);

export const customerServiceRoutes = router;
