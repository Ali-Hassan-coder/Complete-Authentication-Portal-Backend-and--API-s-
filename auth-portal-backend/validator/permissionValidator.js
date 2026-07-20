const Joi = require("joi");

const createPermissionSchema = Joi.object({
    name: Joi.string().pattern(/^(?!.*[0-9]{3})[a-zA-Z]{3,}[a-zA-Z0-9\s]*$/).min(3).max(100).required().messages({
        "string.pattern.base": "Permission name must start with at least 3 alphabets, be meaningful, and cannot contain long strings of numbers."
    }),
    description: Joi.string().pattern(/^(?!.*[0-9]{5})[a-zA-Z]{3,}[a-zA-Z0-9\s,.-]*$/).max(255).allow('', null).messages({
        "string.pattern.base": "Description must start with at least 3 alphabets and be a meaningful sentence."
    })
});

const updatePermissionSchema = Joi.object({
    name: Joi.string().pattern(/^(?!.*[0-9]{3})[a-zA-Z]{3,}[a-zA-Z0-9\s]*$/).min(3).max(100).messages({
        "string.pattern.base": "Permission name must start with at least 3 alphabets, be meaningful, and cannot contain long strings of numbers."
    }),
    description: Joi.string().pattern(/^(?!.*[0-9]{5})[a-zA-Z]{3,}[a-zA-Z0-9\s,.-]*$/).max(255).allow('', null).messages({
        "string.pattern.base": "Description must start with at least 3 alphabets and be a meaningful sentence."
    })
}).min(1);

module.exports = { createPermissionSchema, updatePermissionSchema };