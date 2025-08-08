import { z } from "zod";

export const signupSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8, { message: "Must be at least 8 characters long" })
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?]).+$/,
      {
        message:
          "Password must contain uppercase, lowercase, number, and special character",
      }
    ),
});
