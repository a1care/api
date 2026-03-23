import mongoose from "mongoose";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { Patient } from "../Authentication/patient.model.js";
import { UserAddressModel } from "./address.model.js";
import { addressValidation } from "./address.schema.js";

export const addAddress = asyncHandler(async (req, res) => {
    const userId = req.user?.id
    const payload = {
        ...req.body,
        userId
    }

    const parsed = addressValidation.safeParse(payload)
    if (!parsed.success) {
        console.error("validation failed!", parsed.error)
        throw new ApiError(401, "Validation failed!")
    }

    // Ensure HOME and WORK labels are unique for the user
    if (["HOME", "WORK"].includes(parsed.data.label)) {
        const existing = await UserAddressModel.findOne({
            userId,
            label: parsed.data.label,
            isDeleted: false
        });
        if (existing) {
            throw new ApiError(400, `You already have an address labeled as ${parsed.data.label}. Please edit the existing one or use OTHERS.`);
        }
    }

    const newAddress = new UserAddressModel(parsed.data)
    await newAddress.save()

    //setting it as primary address
    await Patient.findByIdAndUpdate(userId, { $set: { primaryAddressId: newAddress._id } })

    return res.status(201).json(new ApiResponse(201, "added address", newAddress))
})

// get all address by user id 
export const getUserAddresses = asyncHandler(async (req, res) => {
    const userId = req.user?.id
    if (!userId) {
        throw new ApiError(401, "Not authorized")
    }

    if (mongoose.connection.readyState !== 1) {
        throw new ApiError(503, "Database unavailable");
    }

    const address = await UserAddressModel.find({ userId, isDeleted: false })
    const patientSorted = await Patient.findById(userId).select('primaryAddressId').lean()

    const allAddress = address.map(item => ({
        ...item.toObject(),
        isPrimary: patientSorted?.primaryAddressId ? String(item._id) === String(patientSorted.primaryAddressId) : false
    }))

    return res.json(new ApiResponse(200, "addresses fetched", allAddress))

})

export const softDeleteAddress = asyncHandler(async (req, res) => {
    console.log("Delete address called")
    const userId = req.user?.id
    const addressId = req.params.addressId

    if (!userId) {
        throw new ApiError(401, "Not authorized")
    }

    if (!addressId) {
        throw new ApiError(400, "Address ID is required")
    }
    console.log(addressId)


    const address = await UserAddressModel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(addressId), userId: new mongoose.Types.ObjectId(userId) },
        { $set: { isDeleted: true } }
    );
    if (!address) {
        throw new ApiError(404, "Address not found or you are not authorized to delete this address")
    }

    const userWithAddress = await Patient.findOneAndUpdate({ primaryAddressId: new mongoose.Types.ObjectId(addressId) }, {
        $set: { primaryAddressId: null },
    })

    console.log("updating user id", userWithAddress)

    return res.json(new ApiResponse(200, "Address deleted successfully", address))
})

export const makePrimaryAddress = asyncHandler(async (req, res) => {
    const { addressId } = req.params
    const userId = req.user?.id

    if (!addressId) {
        throw new ApiError(401, "Address id not found from user")
    }

    const checkAddress = await UserAddressModel.findOne({
        _id: new mongoose.Types.ObjectId(addressId),
        userId: new mongoose.Types.ObjectId(userId)
    })
    if (!checkAddress) throw new ApiError(404, "Address not exist")
    const updateAddressData = await Patient.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(userId) }, { $set: { primaryAddressId: new mongoose.Types.ObjectId(addressId) } })
    return res.status(200).json(new ApiResponse(200, "Primary address set", updateAddressData))
})

export const updateAddress = asyncHandler(async (req, res) => {
    const { addressId } = req.params
    const userId = req.user?.id

    const payload = {
        ...req.body,
        userId
    }

    const parsed = addressValidation.safeParse(payload)
    if (!parsed.success) {
        throw new ApiError(401, "Validation failed!")
    }

    // Ensure HOME and WORK labels are unique for the user when updating
    if (["HOME", "WORK"].includes(parsed.data.label)) {
        const existing = await UserAddressModel.findOne({
            userId,
            label: parsed.data.label,
            isDeleted: false,
            _id: { $ne: new mongoose.Types.ObjectId(addressId) }
        });
        if (existing) {
            throw new ApiError(400, `An address with label ${parsed.data.label} already exists. Please choose a different label.`);
        }
    }

    const updatedAddress = await UserAddressModel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(addressId), userId: new mongoose.Types.ObjectId(userId) },
        { $set: parsed.data },
        { new: true }
    )

    if (!updatedAddress) {
        throw new ApiError(404, "Address not found")
    }

    return res.json(new ApiResponse(200, "Address updated successfully", updatedAddress))
})