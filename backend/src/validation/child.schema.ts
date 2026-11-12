import { z } from 'zod';

export const createChildSchema = z.object({
  name: z.string().min(1),
  dob: z.coerce.date(),
  parentIds: z.array(z.string()),
});
