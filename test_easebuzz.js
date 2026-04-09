
import axios from 'axios';

const params = {
  key: "NQOKGR29D",
  txnid: "TEST_" + Date.now(),
  amount: "1.00",
  productinfo: "Test",
  firstname: "Test",
  email: "test@example.com",
  phone: "9999999999",
  surl: "https://example.com/s",
  furl: "https://example.com/f",
  udf1: "", udf2: "", udf3: "", udf4: "", udf5: "",
  udf6: "", udf7: "", udf8: "", udf9: "", udf10: "",
  hash: "dummy_hash" // Hash will be wrong but it should give "Invalid Hash" instead of 404
};

async function test(url) {
  console.log(`Testing ${url}...`);
  try {
    const formData = new URLSearchParams();
    for (const key in params) {
      formData.append(key, params[key]);
    }
    const res = await axios.post(url, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log(`  Response Status: ${res.status}`);
    console.log(`  Response Data:`, JSON.stringify(res.data).slice(0, 100));
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    if (err.response) {
      console.log(`  Error Status: ${err.response.status}`);
      console.log(`  Error Data:`, err.response.data.slice(0, 100));
    }
  }
}

async function run() {
  await test("https://testpay.easebuzz.in/payment/initiate");
  await test("https://testpay.easebuzz.in/pay/initiate");
  await test("https://testpay.easebuzz.in/payment/initiateLink");
}

run();
