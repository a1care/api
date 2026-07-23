import mongoose from "mongoose";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { Patient } from "../Authentication/patient.model.js";
import { UserAddressModel } from "./address.model.js";
import { addressValidation } from "./address.schema.js";

const deriveHouseNo = (street?: string) => {
    const firstChunk = String(street || "").split(",")[0]?.trim() || "";
    return firstChunk || undefined;
};

const normalizeAddressPayload = (body: any, userId: string) => {
    const street = String(body?.street || body?.address || body?.addressLine1 || "").trim();
    const houseNo = String(body?.houseNo || deriveHouseNo(street) || "").trim();
    return {
        ...body,
        userId,
        street,
        // keep aliases synced for compatibility with multiple client versions
        address: String(body?.address || street || "").trim(),
        addressLine1: String(body?.addressLine1 || street || "").trim(),
        houseNo: houseNo || undefined
    };
};

export const addAddress = asyncHandler(async (req, res) => {
    const userId = req.user?.id
    if (!userId) {
        throw new ApiError(401, "Not authorized")
    }
    const payload = normalizeAddressPayload(req.body, userId)

    const parsed = addressValidation.safeParse(payload)
    if (!parsed.success) {
        console.error("validation failed!", parsed.error)
        throw new ApiError(401, "Validation failed!")
    }

    // If adding a HOME or WORK address, demote any existing active address with that label to OTHERS
    if (["HOME", "WORK"].includes(parsed.data.label)) {
        await UserAddressModel.updateMany(
            {
                userId,
                label: parsed.data.label,
                isDeleted: false
            },
            { $set: { label: "OTHERS" } }
        );
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
    if (!userId) {
        throw new ApiError(401, "Not authorized")
    }

    const payload = normalizeAddressPayload(req.body, userId)

    const parsed = addressValidation.safeParse(payload)
    if (!parsed.success) {
        throw new ApiError(401, "Validation failed!")
    }

    // If updating to HOME or WORK, demote any existing active address with that label to OTHERS
    if (["HOME", "WORK"].includes(parsed.data.label)) {
        await UserAddressModel.updateMany(
            {
                userId,
                label: parsed.data.label,
                isDeleted: false,
                _id: { $ne: new mongoose.Types.ObjectId(addressId) }
            },
            { $set: { label: "OTHERS" } }
        );
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
