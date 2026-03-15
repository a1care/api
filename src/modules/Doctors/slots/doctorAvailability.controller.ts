import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import { DateTimeFormatter, generateSlots, readableTimeFormate } from "../../../utils/generateSlots.js";
import doctorAppointmentModel from "../../Bookings/doctorAppointment.model.js";
import blockTimeModel, { doctoBlockTimeValidations } from "./blockTime.model.js";
import doctorAvailabilityModel from "./doctorAvailability.model.js";
import doctorAvailabilityValidation from "./doctorAvailable.schema.js";
import mongoose from "mongoose";

export const createDoctorAvailability = asyncHandler(async (req , res)=>{
    const {doctorId} = req.params // for testing we are taking doctor id from params afther authentication it should come from middleware
    const payload = {
        ...req.body  , 
        doctorId
    }

    const parsed = doctorAvailabilityValidation.safeParse(payload)
    if(!parsed.success){
        throw new ApiError(401 , "Validation failed")
    }

    const newDoctorValidation = new doctorAvailabilityModel(payload)
    await newDoctorValidation.save()

    return res.status(201).json(new ApiResponse(201 , "Doctor availability created" , newDoctorValidation))

})

export const getDoctorAvailabilitybyDoctorId = asyncHandler(async (req , res)=>{
    const {doctorId} = req.params
    const doctorAvailability = await doctorAvailabilityModel.find({doctorId:new mongoose.Schema.Types.ObjectId(doctorId as string)})
    return res.status(200).json(new ApiResponse(200 , "Doctor availability" , doctorAvailability))
})

// block timings
export const blockTiming = asyncHandler(async (req , res)=>{
    const {doctorId} = req.params
    const payload = {
        ...req.body ,
        date:new Date(req.body.date),
        doctorId
    }

    const parsed = doctoBlockTimeValidations.safeParse(payload)
    if(!parsed.success){
        console.error("Error in blocking time" , parsed.error)
        throw new ApiError(401 , "Validation failed")
    }

     const newBlockTime =  new blockTimeModel(payload)
     await newBlockTime.save()
     return res.status(201).json(new ApiResponse(201 , "Timings are blocked" , newBlockTime))
})


//Available slots for doctor
export const availableSlotByDoctorId = asyncHandler(async (req, res) => {
  const { doctorId, date } = req.params;

  if (!doctorId || !date) {
    throw new ApiError(400, "Missing doctorId or date");
  }

  // 1️⃣ Validate doctorId
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new ApiError(400, "Invalid doctorId");
  }

  // 2️⃣ Validate date
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    throw new ApiError(400, "Invalid date format. Use YYYY-MM-DD");
  }

  // 3️⃣ Fetch doctor availability
  const checkingSlot = await doctorAvailabilityModel.findOne({
    doctorId: new mongoose.Types.ObjectId(doctorId)
  });

  if (!checkingSlot) {
    throw new ApiError(404, "Doctor not Available right now...");
  }

  const { startingTime, endingTime, slotDuration } = checkingSlot as any;

  // 4️⃣ Generate all slots
  const slots = generateSlots({
    date,
    startingTime,
    endingTime,
    duration: slotDuration
  });

  // 5️⃣ Fetch blocked times (date OR weekday)
  const weekday = parsedDate.getDay();

  const blocked = await blockTimeModel.find({
    doctorId: new mongoose.Types.ObjectId(doctorId),
    $or: [{ date }, { weekDays: weekday }]
  });

  // 6️⃣ Fetch booked appointments
  const bookedAppointments = await doctorAppointmentModel.find({
    doctorId: new mongoose.Types.ObjectId(doctorId),
    date: parsedDate
  });
  console.log("these are booked appointments" , bookedAppointments)

  // 7️⃣ Normalize all unavailable intervals into Date objects
  const busySlots = [
    ...blocked.map(item => ({
      startingTime: DateTimeFormatter(date, item.startingTime),
      endingTime: DateTimeFormatter(date, item.endingTime)
    })),
    ...bookedAppointments.map(item => ({
      startingTime: DateTimeFormatter(date, item.startingTime),
      endingTime: DateTimeFormatter(date, item.endingTime)
    }))
  ];

  const isToday = date === new Date().toISOString().split("T")[0];

  // 8️⃣ Filter available slots (THIS IS CORRECT LOGIC)
  const availableSlots = slots.filter(slot =>
    // If today, filter out past time slots
    (isToday
      ? slot.startSlot > new Date() 
      : true) &&
    // Check if slot overlaps with any busy slot

    !busySlots.some(busy => 
      slot.startSlot < busy.endingTime &&
      slot.endSlot > busy.startingTime
    )
  );

  // ✅ RETURN AVAILABLE SLOTS (NOT slots)
  let readableSlots = availableSlots.map(item=>({
    startingTime:readableTimeFormate(item.startSlot) ,
    endingTime:readableTimeFormate(item.endSlot)
  }))
  
  return res.json(
    new ApiResponse(200, "Available Slots", readableSlots)
  );
});
