import { Router } from "express";
import auth from "../../middlewares/auth";
import authorize from "../../middlewares/authorized";
import { contactControllers } from "./contact.controllers";

const router = Router();

// Public — anyone can send contact message
router.post("/", contactControllers.createContact);

// Admin-only routes
router.get("/", auth, authorize(["SUPER_ADMIN"]), contactControllers.getAllContacts);
router.get("/unread/count", auth, authorize(["SUPER_ADMIN"]), contactControllers.getUnreadCount);
router.get("/:contactId", auth, authorize(["SUPER_ADMIN"]), contactControllers.getContactById);
router.patch("/:contactId/read", auth, authorize(["SUPER_ADMIN"]), contactControllers.markAsRead);
router.patch("/read/all", auth, authorize(["SUPER_ADMIN"]), contactControllers.markAllAsRead);
router.delete("/:contactId", auth, authorize(["SUPER_ADMIN"]), contactControllers.deleteContact);

export const contactRoutes = router;
