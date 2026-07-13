const Joi = require("joi");

const resetPasswordSchema = Joi.object({
    resetToken: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
});

module.exports = { resetPasswordSchema };