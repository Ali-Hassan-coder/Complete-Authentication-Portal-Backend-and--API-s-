const { sequelize, User, Role, Permission, UserRolePermission } = require('./models');

async function test() {
    const user = await User.findOne({ where: { email: 'test_qa@gmail.com' } });
    if(user) {
        console.log('User:', user.id, user.email, user.role);
        
        const overrides = await UserRolePermission.findAll({
            where: { user_id: user.id },
            include: [{ model: Permission }]
        });
        
        console.log('Overrides:');
        for (const override of overrides) {
            console.log(' - ', override.Permission.name);
        }
    }
    process.exit(0);
}
test();
