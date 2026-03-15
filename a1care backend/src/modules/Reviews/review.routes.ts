import express from "express";
import { protect } from "../../middlewares/protect.js";
import { addReview, getDoctorReviews, getServiceReviews } from "./review.controller.js";

const router = express.Router();

router.post("/add", protect, addReview);
router.get("/doctor/:doctorId", getDoctorReviews);
router.get("/service/:childServiceId", getServiceReviews);

export default router;
