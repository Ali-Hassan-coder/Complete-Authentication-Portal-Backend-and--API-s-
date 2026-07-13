const Joi = require("joi");

const assignPermissionSchema = Joi.object({
    roleId: Joi.number().integer().required(),
    permissionId: Joi.number().integer().required()
});

module.exports = { assignPermissionSchema };