import { z } from 'zod'

export const SignupNameSchema = z.string().trim().min(1, 'This field is required.').max(60, 'Use 60 characters or fewer.')

export const SignupPhoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+?63|0)9\d{9}$/, 'Enter a valid Philippine mobile number.')

export const SignupEmailSchema = z.string().trim().email('Enter a valid email address.').max(254, 'Email must be 254 characters or fewer.')

export const SignupPasswordPairSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters.').max(128, 'Password must be 128 characters or fewer.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const SignupEmergencyContactSchema = z.object({
  name: z.string().trim().min(1, 'Enter the contact name.').max(60, 'Contact name must be 60 characters or fewer.'),
  relationship: z.string().trim().min(1, 'Enter the contact relationship.').max(60, 'Relationship must be 60 characters or fewer.'),
  phone: SignupPhoneSchema,
})
