const fs = require('fs');
const path = 'c:\\Users\\SAI DIHNESH\\Desktop\\Reddy\\api\\admin-panel\\src\\pages\\UserManagementPage.tsx';
let content = fs.readFileSync(path, 'utf8').split('\n');

// Line 550 was 0-indexed 549 in array.
// Let's check 548-552.

if (content[549].trim() === '</div>') {
    content.splice(549, 1); // Delete line 550
    fs.writeFileSync(path, content.join('\n'));
    console.log('Removed extra </div> at line 550');
} else {
    console.log('Line 550 is not </div>. Check again.');
    console.log('Line 549:', content[549]);
}
