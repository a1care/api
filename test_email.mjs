import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const APP_CONFIG_PATH = path.join(process.cwd(), 'data', 'app-config.json');

async function testEmailCredentials() {
    try {
        const raw = await fs.readFile(APP_CONFIG_PATH, "utf-8").catch(() => null);
        if (!raw) {
            console.error("❌ No config file found at", APP_CONFIG_PATH);
            process.exit(1);
        }

        const parsed = JSON.parse(raw);
        const settingsDoc = parsed.system;
        
        if (!settingsDoc || !settingsDoc.email) {
            console.error("❌ No email settings found in the config.");
            process.exit(1);
        }

        const config = settingsDoc.email;
        console.log(`Testing credentials for host: ${config.host}, port: ${config.port}, user: ${config.user}`);

        if (!config.user || !config.pass || !config.host) {
            console.error("❌ Email configuration is incomplete in the config.");
            process.exit(1);
        }

        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.port === 465,
            auth: {
                user: config.user,
                pass: config.pass,
            },
        });

        console.log("Verifying connection to email server...");
        
        transporter.verify(function(error, success) {
            if (error) {
                console.error("❌ Email connection failed:");
                console.error(error);
            } else {
                console.log("✅ Email connection successful! The credentials are correct and the server is ready to take our messages.");
            }
            process.exit(error ? 1 : 0);
        });

    } catch (err) {
        console.error("Script error:", err);
        process.exit(1);
    }
}

testEmailCredentials();
