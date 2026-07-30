import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { KnowledgeBase } from '../modules/KnowledgeBase/knowledgeBase.model.js';

dotenv.config();

const guides = [
  {
    title: "How to handle emergency tele-consultations",
    content: "<h2>Emergency Protocols</h2><p>When you receive an emergency tele-consultation request, please ensure you answer within 60 seconds...</p>",
    category: "Booking",
    targetAudience: "Doctor"
  },
  {
    title: "Guide to updating your available slots",
    content: "<h2>Managing Availability</h2><p>To ensure patients can book you accurately, keep your availability updated daily in the Profile tab...</p>",
    category: "Profile",
    targetAudience: "Doctor"
  },
  {
    title: "Best practices for home-visit checkups",
    content: "<h2>Home Visits</h2><p>Always carry your verified A1Care ID badge. Ensure you have the standard medical kit ready before arriving at the patient's location...</p>",
    category: "General",
    targetAudience: "Nurse"
  },
  {
    title: "Logging patient vitals securely",
    content: "<h2>Data Security</h2><p>Vitals must be uploaded immediately via the app's secure form to maintain HIPAA compliance and ensure doctors have real-time access...</p>",
    category: "General",
    targetAudience: "Nurse"
  },
  {
    title: "Navigating the fastest routes via the app",
    content: "<h2>Navigation</h2><p>Use the built-in map button on the active booking screen to automatically open Google Maps with the fastest route to the patient...</p>",
    category: "Booking",
    targetAudience: "Ambulance"
  },
  {
    title: "What to do during vehicle breakdowns",
    content: "<h2>Breakdown Protocol</h2><p>If your ambulance breaks down while en route to a patient, immediately tap the 'SOS / Breakdown' button on the active booking to alert dispatch...</p>",
    category: "General",
    targetAudience: "Ambulance"
  },
  {
    title: "Managing inventory and equipment deposits",
    content: "<h2>Rentals Management</h2><p>For high-value equipment like oxygen cylinders, ensure the deposit is collected online before dispatching the delivery partner...</p>",
    category: "General",
    targetAudience: "Rental"
  },
  {
    title: "Verifying customer identity upon delivery",
    content: "<h2>Identity Verification</h2><p>Always ask for the OTP provided in the customer's app before handing over the medical equipment...</p>",
    category: "Booking",
    targetAudience: "Rental"
  },
  {
    title: "How the Wallet and Payout system works",
    content: "<h2>Earnings & Payouts</h2><p>Your wallet accumulates earnings after every successful booking. Payouts can be requested once your balance exceeds the minimum threshold. Transfers take 24-48 hours...</p>",
    category: "Wallet",
    targetAudience: "All"
  },
  {
    title: "Understanding the Commission structure",
    content: "<h2>Platform Fees</h2><p>A1Care charges a standard commission based on your provider category. The exact percentage is visible in your Wallet > Commission details page...</p>",
    category: "Wallet",
    targetAudience: "All"
  }
];

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/a1care';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if guides already exist to avoid duplicates
    const count = await KnowledgeBase.countDocuments();
    if (count > 0) {
      console.log('Knowledge Base is already seeded. Exiting.');
      process.exit(0);
    }

    await KnowledgeBase.insertMany(guides);
    console.log('Successfully seeded Knowledge Base!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding knowledge base:', error);
    process.exit(1);
  }
};

seedDB();
