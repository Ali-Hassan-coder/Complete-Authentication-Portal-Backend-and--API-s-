const Joi = require("joi");

const updateUserSchema = Joi.object({
    name: Joi.string().min(2),
    phone: Joi.string(),
}).min(1); // at least one field must be provided

module.exports = { updateUserSchema };