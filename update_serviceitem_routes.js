const fs = require('fs');

const filePath = 'src/routes/serviceItem.routes.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add the new route after the get by id route
const oldRoute = `router.get('/', serviceItemController.getAllServiceItems);
router.get('/:id', serviceItemController.getServiceItemById);`;

const newRoute = `router.get('/', serviceItemController.getAllServiceItems);
router.get('/:id/children', serviceItemController.getChildServiceItems);
router.get('/:id', serviceItemController.getServiceItemById);`;

content = content.replace(oldRoute, newRoute);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Updated serviceItem.routes.js - Added route for getting child service items');
