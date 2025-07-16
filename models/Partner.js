import mongoose from "mongoose";

const PartnerSchema = new mongoose.Schema(
  {
    shopName: {
      type: String,
      required: true,
    },
    ownerName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      required: true,
    },
    city: String,
    state: String,
    pincode: String,

    partnerType: {
      type: String,
      enum: ["Reseller", "Franchise", "Distributor", "Vendor"],
      default: "Reseller",
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Partner = mongoose.model("Partner", PartnerSchema);

export default Partner;
