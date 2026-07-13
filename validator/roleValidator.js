const Joi = require("joi");

const createRoleSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    description: Joi.string().max(255).allow('', null)
});

const updateRoleDetailsSchema = Joi.object({
    name: Joi.string().min(2).max(50),
    description: Joi.string().max(255).allow('', null)
}).min(1);

module.exports = { createRoleSchema, updateRoleDetailsSchema };