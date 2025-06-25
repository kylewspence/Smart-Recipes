// Utility function to safely extract error messages
export const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'Unknown error occurred';
};

// Utility function to safely extract error details
export const getErrorDetails = (error: unknown): Record<string, any> => {
    if (error instanceof Error) {
        return {
            message: error.message,
            name: error.name,
            stack: error.stack
        };
    }
    if (typeof error === 'string') {
        return { message: error };
    }
    return { message: 'Unknown error occurred', error: String(error) };
}; 