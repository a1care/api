const fs = require('fs');

const filePath = 'src/routes/mainroutes.js';
let content = fs.readFileSync(filePath, 'utf8');

// Change homescreen to admin
content = content.replace("mainRoutes.use('/homescreen', homescreen);", "mainRoutes.use('/admin', homescreen);");

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Updated mainroutes.js - Changed /homescreen to /admin');
