const fs = require('fs');

const filePath = 'src/controllers/serviceItem.controller.js';
let content = fs.readFileSync(filePath, 'utf8');

// Add new function before the last closing brace
const newFunction = `
/**
 * @route GET /api/service-items/:parentItemId/children
 * @description Get child service items for a parent service item
 * @access Public
 */
exports.getChildServiceItems = async (req, res) => {
    const { parentItemId } = req.params;
    try {
        const parentItem = await ServiceItem.findById(parentItemId);
        if (!parentItem) {
            return res.status(404).json({ message: 'Parent service item not found.' });
        }

        const childItems = await ServiceItem.find({ 
            parentItemId: parentItemId,
            is_active: true 
        }).populate('serviceId', 'name type');

        res.status(200).json({ 
            success: true, 
            parent: {
                id: parentItem._id,
                name: parentItem.name,
                level: parentItem.level
            },
            children: childItems 
        });
    } catch (error) {
        console.error('Get child service items error:', error);
        res.status(500).json({ message: 'Server error fetching child service items.' });
    }
};
`;

// Insert before the last line
content = content.trimEnd() + newFunction;

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Updated serviceItem.controller.js - Added getChildServiceItems function');
