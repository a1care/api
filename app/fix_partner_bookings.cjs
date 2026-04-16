const fs = require('fs');
const path = 'c:\\Users\\SAI DIHNESH\\Desktop\\Reddy\\api\\partner app\\a1care-partner\\app\\(tabs)\\bookings.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = '<Text style={[styles.detailText, { fontWeight: \'800\', color: \'#1E293B\' }]}>₹{b.totalAmount || 0}</Text>';
const replacement = `<View>
                                            <Text style={[styles.detailText, { fontWeight: '800', color: '#1E293B' }]}>₹{b.totalAmount || 0}</Text>
                                            {b.paymentMode === 'OFFLINE' && <Text style={{ fontSize: 8, color: '#F59E0B', fontWeight: '900' }}>CASH PAYMENT</Text>}
                                         </View>`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content);
console.log('Fixed Partner App bookings.tsx');
