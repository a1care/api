import * as z from 'zod'

const doctorAvailabilityValidation = z.object({
    doctorId:z.string() , 
    weekDays:z.array(z.number()) , 
    startingTime:z.string() , 
    endingTime:z.string() , 
    slotDuration:z.string()
})

export default doctorAvailabilityValidation