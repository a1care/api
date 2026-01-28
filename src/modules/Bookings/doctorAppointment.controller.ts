import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import doctorAppoinmentValidations from "./doctoAppointments.schema.js";
import doctorAppointmentModel from "./doctorAppointment.model.js";

export const createDoctorAppointment = asyncHandler(async (req , res)=>{
    const patientId = req.user?.id
    console.log("this is request body" , req.body)
    const {doctorId} = req.params
    const payload = {
        ...req.body , 
        doctorId , 
        patientId ,
    }

    const parsed = doctorAppoinmentValidations.safeParse(payload)
    if(!parsed.success){
        console.error("Error in creating doctor appointment" , parsed.error)
        throw new ApiError(401 , `Validation failed! ${parsed.error}`)
    }

    const newAppointment = new doctorAppointmentModel(parsed.data)
    await newAppointment.save()
    return res.status(201).json(new ApiResponse(201 , "Appointment booked" , newAppointment))

})

// get appointments by doctor id


//get appointment by patient id 
export const getAppointmentsByPatientId = asyncHandler(async (req , res)=>{
    const patientId = req.user?.id
    const appointments = await doctorAppointmentModel.find({patientId:patientId as string}).populate('doctorId').populate('patientId')
    return res.status(200).json(new ApiResponse(200 , "Appointments fetched" , appointments))
})