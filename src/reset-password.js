// Uso: npm run reset-password -- <usuario> <nueva-contraseña>
const bcrypt = require('bcryptjs');
const { run, get } = require('./db');
const [, , user, pass] = process.argv;
if (!user || !pass) { console.log('Uso: npm run reset-password -- <usuario> <nueva-contraseña>'); process.exit(1); }
const u = get('SELECT id FROM users WHERE username=?', user.toLowerCase());
if (u) run('UPDATE users SET password_hash=? WHERE id=?', bcrypt.hashSync(pass, 10), u.id);
else run('INSERT INTO users(username,password_hash) VALUES(?,?)', user.toLowerCase(), bcrypt.hashSync(pass, 10));
run('DELETE FROM sessions');
console.log(`Listo. Contraseña actualizada para "${user.toLowerCase()}".`);
