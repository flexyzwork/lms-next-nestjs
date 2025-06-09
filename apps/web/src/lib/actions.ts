'use server';

import { uploadFormSchema } from './schemas';

export type FormState =
  | {
      errors?: {
        file?: string[];
      };
      message?: string;
    }
  | undefined;

export async function uploadFile(state: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = uploadFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const res = await fetch('http://localhost:4000/courses/upload', {
    method: 'POST',
    body: formData,
  });

  if (res.ok) {
    return {
      message: 'Success! File Uploaded',
    };
  } else
    return {
      message: 'Oops, Something Went Wrong',
    };
}
