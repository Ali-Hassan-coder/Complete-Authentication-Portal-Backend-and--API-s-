const Joi = require("joi");

const createPermissionSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(255).allow('', null)
});

const updatePermissionSchema = Joi.object({
    name: Joi.string().min(2).max(100),
    description: Joi.string().max(255).allow('', null)
}).min(1);

module.exports = { createPermissionSchema, updatePermissionSchema };