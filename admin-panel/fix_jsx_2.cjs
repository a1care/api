const fs = require('fs');
const path = 'c:\\Users\\SAI DIHNESH\\Desktop\\Reddy\\api\\admin-panel\\src\\pages\\UserManagementPage.tsx';
let content = fs.readFileSync(path, 'utf8').split('\n');

// Line numbers from my view (0-indexed in array):
// 478: <WalletSection ... />
// 479: </div>
// 480: 
// 481: </div>
// 482: 

if (content[480].trim() === '</div>') {
    content.splice(480, 2); // Remove line 481 and empty line
    fs.writeFileSync(path, content.join('\n'));
    console.log('Removed extra </div> at line 481');
} else {
    console.log('Line 481 is not a </div>. Check again.');
    console.log('Line 480:', content[480]);
}
