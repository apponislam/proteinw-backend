import { z } from "zod";

const addressSchema = z.object({
    organizationName: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
});

export const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["SUPER_ADMIN", "ADMIN", "MEMBER"]).default("MEMBER"),
    phone: z.string().optional(),
    profileImage: z.string().optional(),
    profession: z.enum(["LEADER", "TEACHER", "PARENT", "COACH"]).optional(),
    address: z
        .string()
        .optional()
        .transform((val) => (val ? JSON.parse(val) : undefined))
        .pipe(addressSchema)
        .optional(),
    goal: z.string().optional(),
    salesStartDate: z
        .string()
        .transform((val) => (val ? new Date(val) : undefined))
        .optional(),
    salesEndDate: z
        .string()
        .transform((val) => (val ? new Date(val) : undefined))
        .optional(),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const verifyEmailSchema = z.object({
    token: z.string(),
    email: z.string().email(),
});

export const updateProfileSchema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    profession: z.enum(["LEADER", "TEACHER", "PARENT", "COACH"]).optional(),
    profileImage: z.string().optional(),
    address: z
        .string()
        .optional()
        .transform((val) => (val ? JSON.parse(val) : undefined))
        .pipe(addressSchema)
        .optional(),
    goal: z.string().optional(),
    salesStartDate: z
        .string()
        .transform((val) => (val ? new Date(val) : undefined))
        .optional(),
    salesEndDate: z
        .string()
        .transform((val) => (val ? new Date(val) : undefined))
        .optional(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(6),
});

export const updateEmailSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const resendEmailUpdateSchema = z.object({
    password: z.string(),
});
