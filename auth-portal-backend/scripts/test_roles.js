const { sequelize, User, Role, UserRole } = require('./models');

async function test() {
    const roles = await Role.findAll();
    console.log('Roles:', roles.map(r => r.name));
    
    const user = await User.findOne({ where: { email: 'test_qa@gmail.com' } });
    if(user) {
        console.log('User role before:', user.role);
        await user.update({ role: 'auditor' });
        console.log('User role after:', user.role);
    }
    process.exit(0);
}
test();
