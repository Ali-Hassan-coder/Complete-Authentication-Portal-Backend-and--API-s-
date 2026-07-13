const Joi = require("joi");

const verifyOtpSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).pattern(/^[0-9]+$/).required()
});

module.exports = { verifyOtpSchema };
