import { Schema, model } from "mongoose";

const RoleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    description: {
      type: String,
      trim: true
    },

    // what this role is allowed to do
    capabilities: {
      type: [String],
      enum: ["HOME_VISIT", "HOSPITAL_VISIT", "VIRTUAL"],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "At least one capability is required"
      }
    },

    requiresLicense: {
      type: Boolean,
      default: false
    },

    licenseType: {
      type: String,
      required: function () {
        return this.requiresLicense === true;
      }
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export const RoleModel = model("Role", RoleSchema);
