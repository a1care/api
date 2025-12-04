const fs = require('fs');

const filePath = 'src/controllers/auth.controller.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the login response to include isRegistered flag
const oldResponse = `        // 6. Return success response
        res.status(200).json({
            success: true,
            message: 'Login successful.',
            token: token,
            role: user.role,
        });`;

const newResponse = `        // 6. Check if user has completed registration (has name and email)
        const isRegistered = !!(user.name && user.email);

        // 7. Return success response
        res.status(200).json({
            success: true,
            message: 'Login successful.',
            token: token,
            role: user.role,
            isRegistered: isRegistered,
        });`;

content = content.replace(oldResponse, newResponse);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Updated auth.controller.js - Added isRegistered flag to login response');
