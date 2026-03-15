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
        udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "",
        status, resphash
    } = response;

    // Response hash order: salt|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    const hashString = `${salt}|${status}|||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;

    const generatedHash = crypto.createHash("sha512").update(hashString).digest("hex");
    return generatedHash === resphash;
};
