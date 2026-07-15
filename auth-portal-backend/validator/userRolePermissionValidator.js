const Joi = require("joi");

const userRolePermissionSchema = Joi.object({
    userId: Joi.number().integer().required(),
    roleId: Joi.number().integer().required(),
    permissionIds: Joi.array().items(Joi.number().integer()).min(1).required()
});

module.exports = { userRolePermissionSchema };