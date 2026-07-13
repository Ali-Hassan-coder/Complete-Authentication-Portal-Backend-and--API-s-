// Every response follows exactly this shape:
// { success: true/false, message: "...", data: {...} or null }
// statusCode is passed separately to res.status(), not duplicated inside the JSON body.

const success = (res, statusCode, message, data = null) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

const error = (res, statusCode, message, data = null) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data
    });
};

module.exports = { success, error };