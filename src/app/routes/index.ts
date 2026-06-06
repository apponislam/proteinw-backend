import express from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { publicRoutes } from "../modules/public/public.routes";
import { faqRoutes } from "../modules/faq/faq.routes";
import { contactRoutes } from "../modules/contact/contact.routes";
import { productRoutes } from "../modules/product/product.routes";
import { tierRoutes } from "../modules/tier/tier.routes";
import { groupRoutes } from "../modules/group/group.routes";
const router = express.Router();

const moduleRoutes = [
    {
        path: "/auth",
        route: authRoutes,
    },
    {
        path: "/public",
        route: publicRoutes,
    },

    {
        path: "/faqs",
        route: faqRoutes,
    },
    {
        path: "/contact",
        route: contactRoutes,
    },
    {
        path: "/products",
        route: productRoutes,
    },
    {
        path: "/tiers",
        route: tierRoutes,
    },
    {
        path: "/groups",
        route: groupRoutes,
    },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
