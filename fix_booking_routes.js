const fs = require('fs');

const filePath = 'src/routes/booking.routes.js';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the service items route - change trailing slash to /items
content = content.replace(
    "router.get('/services/:serviceId/', bookingController.getServiceItems);",
    "router.get('/services/:serviceId/items', bookingController.getServiceItems);"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Updated booking.routes.js - Fixed service items route');
