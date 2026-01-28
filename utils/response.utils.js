export const sendSuccessResponse = (res, message, result = []) => {
    return res.status(200).json({ success: true, message, result });
};

export const sendErrorResponse = (res, statusCode = 500, message = "Server error", error = null) => {
    return res.status(statusCode).json({ 
        success: false, 
        message, 
        error: error ? error.message || error : undefined 
    });
};

export const sendNotFoundResponse = (res, message) => {
    return res.status(404).json({ success: false, message, result: [] });
};

export const sendBadRequestResponse = (res, message) => {
    return res.status(400).json({ success: false, message, result: [] });
};

export const sendUnauthorizedResponse = (res, message) => {
    return res.status(401).json({ success: false, message, result: [] });
};