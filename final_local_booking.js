async function trigger() {
    console.log("LOGGING IN...");
    const authRes = await fetch('http://localhost:3000/api/patient/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '9000000001', otp: '123456' })
    });
    const auth = await authRes.json();
    
    if (!auth.data || !auth.data.token) {
        console.error("LOGIN FAILED:", auth);
        return;
    }
    
    console.log("CREATING BOOKING...");
    const bookingRes = await fetch('http://localhost:3000/api/service/booking/create', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.data.token}`
      },
      body: JSON.stringify({
        childServiceId: "67e273f32c66870c2ed14d9b", // Correct Local Dermatologist ID
        addressId: "67f041bd0374e2d36de3da6",
        appointmentDate: "2026-04-05",
        appointmentTime: "10:00 AM",
        paymentMode: "Cash",
        problemDescription: "OFFICIAL LOCAL VERIFICATION TEST"
      })
    });
    const booking = await bookingRes.json();
    console.log("BOOKING RESULT:", JSON.stringify(booking, null, 2));
}
trigger();
