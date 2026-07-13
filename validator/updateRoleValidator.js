const Joi = require("joi");

const updateRoleSchema = Joi.object({
    role: Joi.string().valid('user', 'moderator', 'admin').required()
});

module.exports = { updateRoleSchema };