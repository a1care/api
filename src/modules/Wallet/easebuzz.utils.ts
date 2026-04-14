import crypto from "crypto";

export interface EasebuzzPaymentParams {
    txnid: string;
    amount: string;
    productinfo: string;
    firstname: string;
    phone: string;
    email: string;
    surl: string; // Success URL
    furl: string; // Failure URL
    udf1?: string;
    udf2?: string;
    udf3?: string;
    udf4?: string;
    udf5?: string;
}

export const generateEasebuzzHash = (params: EasebuzzPaymentParams, key: string, salt: string) => {
    const {
        txnid, amount, productinfo, firstname, email,
        udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = ""
    } = params;

    // Key order: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;

    return crypto.createHash("sha512").update(hashString).digest("hex");
};

export const verifyEasebuzzResponse = (response: any, salt: string) => {
    const {
        key, txnid, amount, productinfo, firstname, email,
        status, hash, resphash
    } = response;

    const finalHash = hash || resphash;
    if (!finalHash) return false;

    // Use all 10 UDFs from response
    const udf1 = (response.udf1 || "").toString().trim();
    const udf2 = (response.udf2 || "").toString().trim();
    const udf3 = (response.udf3 || "").toString().trim();
    const udf4 = (response.udf4 || "").toString().trim();
    const udf5 = (response.udf5 || "").toString().trim();
    const udf6 = (response.udf6 || "").toString().trim();
    const udf7 = (response.udf7 || "").toString().trim();
    const udf8 = (response.udf8 || "").toString().trim();
    const udf9 = (response.udf9 || "").toString().trim();
    const udf10 = (response.udf10 || "").toString().trim();

    const formattedAmount = Number(amount).toFixed(2);

    // Response hash order: salt|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    const hashString = `${salt.trim()}|${status}|${udf10}|${udf9}|${udf8}|${udf7}|${udf6}|${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${formattedAmount}|${txnid}|${key}`;

    const generatedHash = crypto.createHash("sha512").update(hashString).digest("hex");
    return generatedHash === finalHash;
};
