import { z } from "zod";

export const UploadFormSchema = z.object({
  file: z
    .instanceof(File)

    .refine((file) => file.size > 0, {
      message: "File must not be empty",
    }),
});