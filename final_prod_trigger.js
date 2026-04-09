async function trigger() {
    console.log("LOGGING IN...");
    const authRes = await fetch('https://api.a1carehospital.in/api/patient/auth/verify-otp', {
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
    const bookingRes = await fetch('https://api.a1carehospital.in/api/service/booking/create', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.data.token}`
      },
      body: JSON.stringify({
        childServiceId: "679a7b67728083eed2ad8f7c", // Dermatologist
        addressId: "679f041bd0374e2d36de3da6",
        appointmentDate: "2026-04-05",
        appointmentTime: "10:00 AM",
        paymentMode: "Cash",
        problemDescription: "OFFICIAL VERIFICATION TEST"
      })
    });
    const booking = await bookingRes.json();
    console.log("BOOKING RESULT:", JSON.stringify(booking, null, 2));
}
trigger();
