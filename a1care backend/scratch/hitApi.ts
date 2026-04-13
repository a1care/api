import axios from 'axios';

async function hit() {
    try {
        console.log("Hitting API...");
        const res = await axios.post("http://localhost:3000/api/patient/auth/send-otp", {
            mobileNumber: "9515362625"
        });
        console.log("Response:", res.data);
    } catch (err: any) {
        console.error("Error:", err.response?.data || err.message);
    }
}

hit();
