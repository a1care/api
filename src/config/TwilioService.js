const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN );

const twilioSendOtp = (mobileNumber) => {

client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID )
      .verifications
      .create({to: mobileNumber, channel: 'sms'})
      .then(verification => console.log(verification.sid));
}

const verifyTwofaOtp = (mobileNumber, code) => {
    return client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks
      .create({to: mobileNumber, code: code})
      .then(verification_check => {
        return verification_check.status;
      });
}

module.exports = { twilioSendOtp, verifyTwofaOtp };