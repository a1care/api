interface generateSlotsArgs {
    date:string , 
    startingTime:string , 
    endingTime:string , 
    duration:number
}

export const generateSlots= ({
    date , 
    startingTime , 
    endingTime , 
    duration
}:generateSlotsArgs)=>{

    const slots = [] 

    const start = new Date(`${date}T${startingTime}:00`)
    const end = new Date(`${date}T${endingTime}:00`)

    let current= new Date(start)

    while(current.getTime()+duration*60000 < end.getTime()){
        const startSlot = new Date(current)
        const endSlot = new Date(current.getTime() + duration*60000)

        slots.push({
            startSlot , 
            endSlot
        })

        current = endSlot
    }
    return slots
}

function normalizeTime(time: string): string {
  const [h, m = "0"] = time.split(":");
  if(!h) return ""
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}


export const DateTimeFormatter = (date:string , time:string)=>{
    const timecheck = normalizeTime(time)
    return new Date(`${date}T${timecheck}:00`)

}

export const readableTimeFormate = (date:Date)=>{

    const time = `${date.getHours()}:${date.getMinutes()}`
    return normalizeTime(time)
}