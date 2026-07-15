// Every response follows exactly this shape:
// { success: true/false, message: "...", data: {...} or null }
// statusCode is passed separately to res.status(), not duplicated inside the JSON body.

const success = (res, statusCode, message, data = null) => {
    const response = { statusCode, success: true, message };
    if (data !== null && data !== undefined) {
        response.data = data;
    }
    return res.status(statusCode).json(response);
};

const error = (res, statusCode, message, data = null) => {
    const response = { statusCode, success: false, message };
    if (data !== null && data !== undefined) {
        response.data = data;
    }
    return res.status(statusCode).json(response);
};

module.exports = { success, error };