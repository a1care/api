import mongoose, { Schema } from "mongoose";

const ServiceRequestSchema = new Schema(
  {
    childServiceId: {
      type: Schema.Types.ObjectId,
      ref: "ChildService",
      required: false
    },
    healthPackageId: {
      type: Schema.Types.ObjectId,
      ref: "HealthPackage",
      required: false
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
        required: function (this: any) {
          return this.bookingType === "SCHEDULED";
        }
      },
      endTime: {
        type: Date,
        required: function (this: any) {
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
    addressId: {
      type: Schema.Types.ObjectId,
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
        "RETURNED_TO_ADMIN",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED"
      ],
      default: "PENDING"
    },
    broadcastedAt: {
      type: Date,
      default: null
    },
    /** When set, hospital was notified first; broadcast to all happens after 10s */
    notifiedHospitalAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
    },
    urgency: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH"],
      default: "NORMAL"
    },
    price: {
      type: Number,
      required: true
    },
    paymentMode: {
      type: String,
      enum: ['ONLINE', 'OFFLINE'],
      default: 'OFFLINE'
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'PENDING'
    },
    commissionPercentage: {
      type: Number,
      default: 0
    },
    commissionAmount: {
      type: Number,
      default: 0
    },
    partnerEarning: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const serviceRequestModel = mongoose.model('serviceRequest', ServiceRequestSchema)
export default serviceRequestModel