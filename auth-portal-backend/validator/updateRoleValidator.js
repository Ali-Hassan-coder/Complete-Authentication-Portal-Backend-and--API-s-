const Joi = require("joi");

const updateRoleSchema = Joi.object({
    role: Joi.string().required()
});

module.exports = { updateRoleSchema };