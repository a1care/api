import mongoose, { Schema } from "mongoose";

const ServiceRequestSchema = new Schema(
  {
    childServiceId: {
      type: Schema.Types.ObjectId,
      ref: "ChildService",
      required: true
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true
    },

    // copied from ChildService at creation time
    bookingType: {
      type: String,
      enum: ["SCHEDULED", "ON_DEMAND"],
      required: true
    },

    fulfillmentMode: {
      type: String,
      enum: ["HOME_VISIT", "HOSPITAL_VISIT", "VIRTUAL"],
      required: true
    },

    // slot only for scheduled services
    scheduledSlot: {
      startTime: {
        type: Date,
        required: function () {
          return this.bookingType === "SCHEDULED";
        }
      },
      endTime: {
        type: Date,
        required: function () {
          return this.bookingType === "SCHEDULED";
        }
      }
    },

    // address only for home visits
    location: {
      lat: {
        type: Number,
        min: -90,
        max: 90
      },
      lng: {
        type: Number,
        min: -180,
        max: 180
      }
    },
    addressId:{
      type:Schema.Types.ObjectId , 
    },

    assignedProviderId: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },

    assignedRoleId: {
      type: Schema.Types.ObjectId,
      ref: "Role"
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "BROADCASTED",
        "ACCEPTED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED"
      ],
      default: "PENDING"
    } , 
    price:{
      type:Number , 
      required:true
    }
  },
  {
    timestamps: true
  }
);

const serviceRequestModel = mongoose.model('serviceRequest' , ServiceRequestSchema)
export default serviceRequestModel