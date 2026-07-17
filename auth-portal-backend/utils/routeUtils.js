const validateRequest = require("../middleware/validationMiddleware");

const routeUtils = {
    routeWrapper: (schema, controller, handlerName) => {
        return [
            validateRequest(schema),
            (req, res, next) => {
                if (typeof controller !== "function") {
                    return res.status(500).json({
                        success: false,
                        message: `${handlerName} handler not available`
                    });
                }
                Promise.resolve(controller(req, res, next)).catch(next);
            }
        ];
    }
};

module.exports = routeUtils;
