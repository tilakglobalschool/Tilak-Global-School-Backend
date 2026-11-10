import { z } from 'zod';

export const createFeeSchema = z.object({
  classGroup:         z.string().trim().min(1).max(100),
  admissionFee:       z.coerce.number().nonnegative().nullable().optional().default(null),
  tuitionFeePerMonth: z.coerce.number().nonnegative().nullable().optional().default(null),
  otherCharges:       z.coerce.number().nonnegative().nullable().optional().default(null),
  fullSessionTotal:   z.coerce.number().nonnegative().nullable().optional().default(null),
  notes:              z.string().max(500).trim().optional().default(''),
  order:              z.coerce.number().int().optional().default(0),
  isActive:           z.boolean().optional().default(true),
});

export const updateFeeSchema = createFeeSchema.partial().omit({ classGroup: true });
