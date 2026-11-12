import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(80),
    email: z.string().trim().email('Please enter a valid email address'),
    phone: z
      .string()
      .trim()
      .regex(/^[+\d\s\-()]{7,20}$/, 'Enter a valid phone number')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter your account email address'),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  verification_code: z.string().trim().min(4, 'Verification code is required'),
  new_password: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
});

export const addressSchema = z.object({
  full_name: z.string().trim().min(2, 'Recipient name is required'),
  phone: z.string().trim().min(7, 'Valid phone number is required'),
  line1: z.string().trim().min(5, 'Street address is required'),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State / Province is required'),
  postal_code: z.string().trim().min(4, 'Postal / ZIP code is required'),
  country: z.string().trim().min(2, 'Country is required'),
  is_default: z.boolean().default(false),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().min(1, 'Rating must be between 1 and 5').max(5),
  title: z.string().trim().min(3, 'Headline must be at least 3 characters').max(100),
  comment: z.string().trim().min(10, 'Review comment must be at least 10 characters').max(1500),
});

export const adminProductSchema = z.object({
  name: z.string().trim().min(3, 'Product name is required'),
  sku: z.string().trim().min(3, 'SKU is required'),
  brand: z.string().trim().min(2, 'Brand is required'),
  category_id: z.string().min(1, 'Category is required'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  discount_percent: z.coerce.number().min(0).max(80).default(0),
  short_description: z.string().trim().min(10, 'Short description is required'),
  description: z.string().trim().min(20, 'Detailed description is required'),
  warranty_info: z.string().trim().min(5, 'Warranty details are required'),
  initial_stock: z.coerce.number().int().min(0).default(10),
  low_stock_threshold: z.coerce.number().int().min(1).default(5),
  lens_mount: z.string().optional(),
  image_url: z.string().url('Valid image URL is required'),
  is_featured: z.boolean().default(false),
  is_new_arrival: z.boolean().default(false),
  is_best_seller: z.boolean().default(false),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type AddressFormValues = z.infer<typeof addressSchema>;
export type ReviewFormValues = z.infer<typeof reviewSchema>;
export type AdminProductFormValues = z.infer<typeof adminProductSchema>;

