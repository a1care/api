import mongoose from "mongoose";
import dotenv from "dotenv";
import DoctorModel from "./src/modules/Doctors/doctor.model";
import ReviewModel from "./src/modules/Reviews/review.model";

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/a1care");
    console.log("Connected to MongoDB");

    const doctorId = "6a67739b6876bb59a1633751"; // from the earlier logs of the user's staffId

    const stats = await ReviewModel.aggregate([
        { $match: { doctorId: new mongoose.Types.ObjectId(doctorId), status: "Active", reviewerType: "patient" } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }
    ]);
    console.log("Stats from aggregation:", stats);

    const reviews = await ReviewModel.find({ doctorId: new mongoose.Types.ObjectId(doctorId) });
    console.log("All Reviews for doctor:", reviews);

    if (stats.length > 0) {
        const doc = await DoctorModel.findByIdAndUpdate(doctorId, {
            rating: stats[0].avg,
        }, { new: true });
        console.log("Updated Doctor:", doc?.rating);
    }

    mongoose.disconnect();
}
run().catch(console.error);
