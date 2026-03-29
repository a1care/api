const fs = require('fs');
const path = 'c:\\Users\\SAI DIHNESH\\Desktop\\Reddy\\api\\admin-panel\\src\\pages\\BookingOperationsPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = '<div className={`text-sm font-black whitespace-nowrap ${booking.paymentStatus === \'COMPLETED\' ? \'text-green-600 dark:text-green-400\' : \'text-[var(--text-main)]\'}`}>\r\n                                                     ₹{booking.totalAmount}\r\n                                                 </div>\r\n                                                 <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mt-0.5">\r\n                                                     {booking.paymentStatus}\r\n                                                 </div>';

const replacement = `<div className={\`text-sm font-black whitespace-nowrap \${booking.paymentStatus === 'COMPLETED' ? 'text-green-600 dark:text-green-400' : 'text-[var(--text-main)]'}\`}>
                                                    ₹{booking.totalAmount}
                                                </div>
                                                <div className="flex flex-col gap-0.5 mt-0.5">
                                                    <div className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">
                                                        {booking.paymentMode === 'OFFLINE' ? 'COD' : (booking.paymentMode || 'ONLINE')}
                                                    </div>
                                                    <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                                                        {booking.paymentStatus}
                                                    </div>
                                                </div>`;

content = content.replace(target, replacement);

// Also update the modal
const modalTarget = `<p className="text-lg font-black text-[var(--text-main)]">₹{selectedBooking.totalAmount}</p>\r\n                                         <span className={\`text-[9px] font-black uppercase tracking-widest \r\n                                             \${selectedBooking.paymentStatus === 'COMPLETED' ? 'text-green-600' : 'text-orange-600'}\`}>\r\n                                             {selectedBooking.paymentStatus}\r\n                                         </span>`;

const modalReplacement = `<p className="text-lg font-black text-[var(--text-main)]">₹{selectedBooking.totalAmount}</p>
                                        <div className="flex flex-col gap-1">
                                            <span className={\`text-[9px] font-black uppercase tracking-widest 
                                                \${selectedBooking.paymentStatus === 'COMPLETED' ? 'text-green-600' : 'text-orange-600'}\`}>
                                                {selectedBooking.paymentStatus}
                                            </span>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md inline-block self-start">
                                                {selectedBooking.paymentMode === 'OFFLINE' ? 'CASH ON DELIVERY' : (selectedBooking.paymentMode || 'ONLINE')}
                                            </span>
                                        </div>`;

content = content.replace(modalTarget, modalReplacement);

fs.writeFileSync(path, content);
console.log('Fixed BookingOperationsPage.tsx');
