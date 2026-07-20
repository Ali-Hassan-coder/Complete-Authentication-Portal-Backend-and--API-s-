const Joi = require("joi");

const updateUserSchema = Joi.object({
    name: Joi.string().pattern(/^[a-zA-Z\s]+$/).min(2).messages({
        "string.pattern.base": "Name must only contain alphabets and spaces.",
    }),
    phone: Joi.string().pattern(/^(?:\+92|0)?3\d{9}$/).messages({
        "string.pattern.base": "Phone number must be a valid Pakistani number (e.g. 03001234567 or +923001234567)",
    }),
}).min(1); // at least one field must be provided

module.exports = { updateUserSchema };