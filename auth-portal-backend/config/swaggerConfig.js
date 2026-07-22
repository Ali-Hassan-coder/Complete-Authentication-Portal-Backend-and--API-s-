// config/swaggerConfig.js
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Authentication Portal API',
            version: '1.0.0',
            description: 'API Documentation for the Authentication Portal Backend'
        },
        servers: [
            {
                url: 'http://localhost:3000',
            },
        ],
    },
    // This points to where your route files are so Swagger can read them
    apis: ['./routes/*.js', './docs/swagger/*.js'],
};

// We generate the spec here and export it, so app.js stays super clean
const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;
