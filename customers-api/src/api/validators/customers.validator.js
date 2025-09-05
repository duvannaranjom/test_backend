import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  email: z.string().email().max(160).trim(),
  phone: z.string().trim().max(40).optional(),
});

export const updateCustomerSchema = z
  .object({
    name: z.string().min(1).max(120).trim().optional(),
    email: z.string().email().max(160).trim().optional(),
    phone: z.string().trim().max(40).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
