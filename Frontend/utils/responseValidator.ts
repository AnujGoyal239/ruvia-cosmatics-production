/**
 * Response Validator Utility
 * Validates API responses against Zod schemas
 */

import { z } from 'zod';
import * as schemas from './responseSchemas';

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate response against a schema
 * @param response - Response data to validate
 * @param schema - Zod schema to validate against
 * @returns ValidationResult - Validation result with data or error
 */
export const validateResponse = <T>(
  response: any,
  schema: z.ZodSchema<T>
): ValidationResult<T> => {
  try {
    const validatedData = schema.parse(response);
    return {
      isValid: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Zod v4 renamed `error.errors` to `error.issues`. The shape of each
      // issue is unchanged (`path`, `message`, etc.), so we just point at
      // the new field. Falling back to `error.errors` keeps things working
      // if a transitive dep is still on Zod v3.
      const issues = (error as { issues?: unknown[]; errors?: unknown[] }).issues
        ?? (error as { errors?: unknown[] }).errors
        ?? [];
      const errorMessages = (issues as Array<{ path: Array<string | number>; message: string }>)
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');

      return {
        isValid: false,
        error: `Validation failed: ${errorMessages}`,
      };
    }

    return {
      isValid: false,
      error: 'Unknown validation error',
    };
  }
};

/**
 * Validate login response
 */
export const validateLoginResponse = (response: any): ValidationResult<any> => {
  return validateResponse(response, schemas.LoginResponseSchema);
};

/**
 * Validate register response
 */
export const validateRegisterResponse = (response: any): ValidationResult<any> => {
  return validateResponse(response, schemas.RegisterResponseSchema);
};

/**
 * Validate get user response
 */
export const validateGetUserResponse = (response: any): ValidationResult<any> => {
  return validateResponse(response, schemas.GetUserResponseSchema);
};

/**
 * Validate get products response
 */
export const validateGetProductsResponse = (response: any): ValidationResult<any> => {
  return validateResponse(response, schemas.GetProductsResponseSchema);
};

/**
 * Validate get product response
 */
export const validateGetProductResponse = (response: any): ValidationResult<any> => {
  return validateResponse(response, schemas.GetProductResponseSchema);
};

/**
 * Validate get orders response
 */
export const validateGetOrdersResponse = (response: any): ValidationResult<any> => {
  return validateResponse(response, schemas.GetOrdersResponseSchema);
};

/**
 * Validate get order response
 */
export const validateGetOrderResponse = (response: any): ValidationResult<any> => {
  return validateResponse(response, schemas.GetOrderResponseSchema);
};

/**
 * Validate create order response
 */
export const validateCreateOrderResponse = (response: any): ValidationResult<any> => {
  return validateResponse(response, schemas.CreateOrderResponseSchema);
};

/**
 * Validate get cart response
 */
export const validateGetCartResponse = (response: any): ValidationResult<any> => {
  return validateResponse(response, schemas.GetCartResponseSchema);
};

/**
 * Validate get wishlist response
 */
export const validateGetWishlistResponse = (response: any): ValidationResult<any> => {
  return validateResponse(response, schemas.GetWishlistResponseSchema);
};

/**
 * Validate get reviews response
 */
export const validateGetReviewsResponse = (response: any): ValidationResult<any> => {
  return validateResponse(response, schemas.GetReviewsResponseSchema);
};

/**
 * Handle validation error
 * Logs error and displays fallback UI
 * @param error - Error message
 * @param context - Context information for logging
 */
export const handleValidationError = (error: string, context?: string): void => {
  const message = context ? `${context}: ${error}` : error;

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Response validation error:', message);
  }

  // Log to error tracking service in production
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(new Error(message));
    console.error('Response validation error:', message);
  }
};

/**
 * Validate and handle response
 * @param response - Response to validate
 * @param schema - Zod schema
 * @param context - Context for error logging
 * @returns Validated data or null if validation fails
 */
export const validateAndHandle = <T>(
  response: any,
  schema: z.ZodSchema<T>,
  context?: string
): T | null => {
  const result = validateResponse(response, schema);

  if (!result.isValid) {
    handleValidationError(result.error || 'Unknown error', context);
    return null;
  }

  return result.data || null;
};

/**
 * Create a safe response handler
 * Validates response and returns data or fallback
 * @param response - Response to validate
 * @param schema - Zod schema
 * @param fallback - Fallback value if validation fails
 * @returns Validated data or fallback
 */
export const safeResponseHandler = <T>(
  response: any,
  schema: z.ZodSchema<T>,
  fallback: T
): T => {
  const result = validateAndHandle(response, schema);
  return result || fallback;
};

/**
 * Validate array response
 * @param response - Response array to validate
 * @param itemSchema - Schema for array items
 * @returns ValidationResult - Validation result
 */
export const validateArrayResponse = <T>(
  response: any,
  itemSchema: z.ZodSchema<T>
): ValidationResult<T[]> => {
  const arraySchema = z.array(itemSchema);
  return validateResponse(response, arraySchema);
};

/**
 * Validate paginated response
 * @param response - Paginated response to validate
 * @returns ValidationResult - Validation result
 */
export const validatePaginatedResponse = (response: any): ValidationResult<any> => {
  return validateResponse(response, schemas.PaginatedResponseSchema);
};
