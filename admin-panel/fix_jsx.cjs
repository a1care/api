const fs = require('fs');
const path = 'c:\\Users\\SAI DIHNESH\\Desktop\\Reddy\\api\\admin-panel\\src\\pages\\UserManagementPage.tsx';
let content = fs.readFileSync(path, 'utf8').split('\n');

// Line numbers are 1-indexed in my thought, but index is 0-indexed.
// 476: </section>
// 477: )
// 478: }
// 479: 
// 480: 

content[475] = '                                         </section>';
content[476] = '                                     )}';
content[477] = '                                     <WalletSection user={selectedUser} category={category} />';
content[478] = '                                 </div>';
content[479] = '';

fs.writeFileSync(path, content.join('\n'));
console.log('Fixed JSX structure in UserManagementPage.tsx');
