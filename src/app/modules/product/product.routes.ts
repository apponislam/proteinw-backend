import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { productControllers } from "./product.controllers";
import { uploadProductImage } from "../../middlewares/multer";

const router = Router();

// Public routes
router.get("/", productControllers.getActiveProducts);
router.get("/:productId", productControllers.getProductById);

// Admin-only routes (SUPER_ADMIN only)
router.post("/", auth, authorize(["SUPER_ADMIN"]), uploadProductImage, productControllers.createProduct);
router.get("/admin/all", auth, authorize(["SUPER_ADMIN"]), productControllers.getAllProducts);
router.patch("/:productId", auth, authorize(["SUPER_ADMIN"]), uploadProductImage, productControllers.updateProduct);
router.patch("/:productId/toggle-status", auth, authorize(["SUPER_ADMIN"]), productControllers.toggleProductStatus);
router.delete("/:productId", auth, authorize(["SUPER_ADMIN"]), productControllers.deleteProduct);

export const productRoutes = router;
