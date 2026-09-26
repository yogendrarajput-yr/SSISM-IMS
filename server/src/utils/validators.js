import { z } from 'zod';

/**
 * Authentication validation schema for email & password login.
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * Hardware asset registration schema.
 * Enforces mandatory asset tags, serial numbers, make, model,
 * and validates optional JSON attributes for future hardware expansion.
 */
export const createAssetSchema = z.object({
  assetTag: z.string().min(3, 'Asset Tag must be at least 3 characters'),
  serialNumber: z.string().min(3, 'Serial Number must be at least 3 characters'),
  category: z.enum(['LAPTOP', 'ROUTER', 'CCTV', 'SMART_TV', 'INTERACTIVE_WHITEBOARD', 'PERIPHERAL', 'OTHER']).default('LAPTOP'),
  make: z.string().min(2, 'Make/Brand is required'),
  model: z.string().min(2, 'Model is required'),
  processor: z.string().optional(),
  generation: z.string().optional().nullable(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  displaySize: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  chargerSerial: z.string().optional().nullable(),
  hasBag: z.boolean().default(true),
  hasMouse: z.boolean().default(false),
  purchaseDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()),
  invoiceNo: z.string().optional().nullable(),
  warrantyExpiry: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()),
  condition: z.enum(['BRAND_NEW', 'GOOD', 'SCRATCHES', 'DAMAGED']).default('BRAND_NEW'),
  status: z.enum(['AVAILABLE', 'ISSUED', 'UNDER_MAINTENANCE', 'RETIRED']).default('AVAILABLE'),
  acquisitionSource: z.enum(['PURCHASED', 'DONATED']).default('PURCHASED'),
  donorId: z.number().int().positive().optional().nullable(),
  remarks: z.string().optional().nullable(),
  departmentId: z.number().int().positive().optional().nullable(),
  attributes: z.record(z.any()).optional().nullable(),
});

/**
 * Asset update schema (all fields optional).
 */
export const updateAssetSchema = createAssetSchema.partial();

/**
 * Asset allocation issuance schema.
 * Requires valid assetId, recipientId, condition, and optional fee override flag.
 */
export const createAllocationSchema = z.object({
  assetId: z.number().int().positive('Valid Asset ID is required'),
  recipientId: z.number().int().positive('Valid Recipient ID is required'),
  dueDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()),
  issueCondition: z.enum(['BRAND_NEW', 'GOOD', 'SCRATCHES', 'DAMAGED']).default('GOOD'),
  notes: z.string().optional().nullable(),
  overrideUnpaidFeeWarning: z.boolean().default(false),
});

/**
 * Hardware return inspection schema.
 */
export const returnAllocationSchema = z.object({
  returnCondition: z.enum(['BRAND_NEW', 'GOOD', 'SCRATCHES', 'DAMAGED']),
  notes: z.string().optional().nullable(),
  fineAmount: z.number().nonnegative().optional().nullable(),
  fineReason: z.string().optional().nullable(),
  finePaid: z.boolean().optional().nullable(),
  finePaymentMode: z.string().optional().nullable(),
});

/**
 * Hardware maintenance and upgrade logging schema.
 */
export const createMaintenanceSchema = z.object({
  assetId: z.number().int().positive('Valid Asset ID is required'),
  type: z.enum(['RAM_UPGRADE', 'SSD_UPGRADE', 'BATTERY_REPLACEMENT', 'SCREEN_REPAIR', 'KEYBOARD_REPAIR', 'GENERAL_SERVICE', 'OS_INSTALLATION', 'OTHER']),
  cost: z.number().nonnegative().optional().nullable(),
  vendorOrTechnician: z.string().optional().nullable(),
  description: z.string().min(5, 'Detailed description is required'),
  updateAssetStatusTo: z.enum(['AVAILABLE', 'UNDER_MAINTENANCE', 'RETIRED']).optional(),
});

/**
 * Student license fee status update schema.
 */
export const updateFeeSchema = z.object({
  status: z.enum(['PAID', 'UNPAID', 'PARTIAL', 'EXEMPTED']),
  amount: z.number().nonnegative().optional(),
  receiptNo: z.string().optional().nullable(),
  paymentDate: z.string().datetime().optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()),
  notes: z.string().optional().nullable(),
});

