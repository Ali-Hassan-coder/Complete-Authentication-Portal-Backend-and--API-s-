const fs = require('fs');
const acPath = require.resolve('./controllers/authController');
console.log('authController file exists:', fs.existsSync(acPath));
console.log('authController file size:', fs.existsSync(acPath) ? fs.statSync(acPath).size : 0);
console.log('authController file content:\n', fs.existsSync(acPath) ? fs.readFileSync(acPath,'utf8') : '');
delete require.cache[acPath];
const authController = require('./controllers/authController');
console.log('authController resolved:', require.resolve('./controllers/authController'));
console.log('authController raw export:', authController);
const signupSchema = require('./validator/authvalidator').signupSchema;
const loginSchema = require('./validator/loginvalidator').loginSchema;
const validateRequest = require('./middleware/validationMiddleware');

console.log('authController.signup', typeof authController.signup);
console.log('authController.login', typeof authController.login);
console.log('validateRequest(signupSchema)', typeof validateRequest(signupSchema));
console.log('validateRequest(loginSchema)', typeof validateRequest(loginSchema));
console.log('signupSchema defined?', !!signupSchema);
console.log('loginSchema defined?', !!loginSchema);
