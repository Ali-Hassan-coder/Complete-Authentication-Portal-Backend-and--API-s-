const dotenv = require('dotenv');
dotenv.config();
const { Role, Permission } = require('./models');

async function main() {
    try {
        const r = await Role.findOne({ where: { name: 'moderator' } });
        const p = await Permission.findOne({ where: { name: 'list_users' } });
        if (r && p) {
            await r.addPermission(p);
            console.log('Successfully assigned list_users to moderator role!');
        } else {
            console.log('Role or permission not found.');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
