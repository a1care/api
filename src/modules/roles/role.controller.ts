import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { RoleModel } from "./role.model.js";
import roleValidation from "./role.schema.js";

export const createRole = asyncHandler(async (req ,res)=>{
    const parsed = roleValidation.safeParse(req.body)
    if(!parsed.success){
        console.error("validation failed while creating role", parsed.error)
        throw new ApiError(401 , "Valiation failed!")
    }

    const newRole = new RoleModel(parsed.data)
    newRole.save()
    return res.status(201).json(new ApiResponse(201 , "created role" , newRole))
})

export const getRoles = asyncHandler(async (req , res)=>{
    const roles = await RoleModel.find()
    return res.status(200).json(new ApiResponse(200 , "got roles" , roles))
})