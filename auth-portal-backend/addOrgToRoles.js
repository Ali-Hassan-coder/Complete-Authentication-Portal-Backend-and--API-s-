const { sequelize } = require('./models');

(async () => {
    try {
        await sequelize.query('ALTER TABLE "roles" ADD COLUMN "organizationId" INTEGER;');
        console.log('Added organizationId to roles');
    } catch (e) {
        console.error('roles table may already have it', e.message);
    }
    
    try {
        await sequelize.query('ALTER TABLE "permissions" ADD COLUMN "organizationId" INTEGER;');
        console.log('Added organizationId to permissions');
    } catch (e) {
        console.error('permissions table may already have it', e.message);
    }
    process.exit(0);
})();
