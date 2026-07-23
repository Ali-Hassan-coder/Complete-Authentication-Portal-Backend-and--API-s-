const Joi = require("joi");

const signupSchema = Joi.object({
    name: Joi.string().pattern(/^[a-zA-Z\s]+$/).min(3).max(30).required().messages({
        "string.pattern.base": "Name must only contain alphabets and spaces.",
    }),
    organizationName: Joi.string().min(2).max(100).required().messages({
        "string.empty": "Organization Name is required.",
    }),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        "any.only": "Confirm password must match password",
    }),
    phone: Joi.string().pattern(/^(?:\+92|0)?3\d{9}$/).required().messages({
        "string.pattern.base": "Phone number must be a valid Pakistani number (e.g. 03001234567 or +923001234567)",
    }),
});

module.exports = { signupSchema };
