const Joi = require("joi");

const assignRoleSchema = Joi.object({
    userId: Joi.number().integer().required(),
    roleId: Joi.number().integer().required()
});

module.exports = { assignRoleSchema };