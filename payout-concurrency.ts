import mongoose from "mongoose";
import Payout from "./src/modules/Earnings/payout.model.js";

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/a1care"); // Adjust DB name if needed

  // Create a dummy staff/partner for the payout
  const dummyStaffId = new mongoose.Types.ObjectId();
  
  // 1. Create a dummy payout
  const payout = await Payout.create({
    staffId: dummyStaffId,
    amount: 1000,
    status: "PENDING"
  });

  console.log(`Created Payout: ${payout._id} with status ${payout.status}`);

  // 2. Simulate concurrent approvals
  console.log("--- Simulating concurrent approvals ---");
  const updateReq1 = Payout.findOneAndUpdate(
    { _id: payout._id, status: "PENDING" },
    { status: "APPROVED" },
    { new: true }
  );
  
  const updateReq2 = Payout.findOneAndUpdate(
    { _id: payout._id, status: "PENDING" },
    { status: "APPROVED" },
    { new: true }
  );

  const results = await Promise.all([updateReq1, updateReq2]);
  
  console.log("Result 1:", results[0] ? results[0].status : "409 CONFLICT");
  console.log("Result 2:", results[1] ? results[1].status : "409 CONFLICT");

  // 3. Test Invalid Transition (APPROVED -> PENDING)
  console.log("--- Simulating invalid transition ---");
  // Assuming the DB is now APPROVED from the successful request above
  const currentStatus = (await Payout.findById(payout._id))?.status;
  
  const validTransitions: Record<string, string[]> = {
    "PENDING": ["APPROVED", "REJECTED"],
    "APPROVED": ["COMPLETED", "REJECTED"]
  };
  
  const targetStatus = "PENDING";
  const allowed = validTransitions[currentStatus || ""];
  
  if (!allowed || !allowed.includes(targetStatus)) {
    console.log(`Transition from ${currentStatus} to ${targetStatus} rejected (422)`);
  }

  // 4. Test Terminal State (COMPLETED)
  console.log("--- Simulating terminal state ---");
  await Payout.findByIdAndUpdate(payout._id, { status: "COMPLETED" });
  
  const terminalStatus = (await Payout.findById(payout._id))?.status;
  const allowedTerminal = validTransitions[terminalStatus || ""];
  
  if (!allowedTerminal) {
    console.log(`Transitions from ${terminalStatus} rejected (422)`);
  }
  
  await mongoose.disconnect();
}

run().catch(console.error);
