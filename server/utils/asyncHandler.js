// Wraps an async route handler so rejected promises get logged and a 500 response instead of hanging the request
export function asyncHandler(label, fn) {
    return async (req, res) => {
        try {
            await fn(req, res);
        } catch (error) {
            console.error(`${label} failed:`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}
