/**
 * Create a standardized success response
 */
export function createSuccessResponse(data: any) {
  return {
    success: true,
    data
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(message: string, details?: any) {
  return {
    success: false,
    error: {
      message,
      ...details
    }
  };
}
