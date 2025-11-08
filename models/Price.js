import mongoose from "mongoose";

const priceSchema = new mongoose.Schema({
  albumType: {
    type: String,
    enum: ["print", "print_design"],
    required: true,
  },
  userType: {
    type: String,
    enum: ["user", "admin", "retailer", "professional", "Professional"],
    required: true,
  },
  // User-specific pricing (optional)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
    default: null,
  },
  paperSize: {
    type: String,
    required: true,
  },
  glossyPaperPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  glossySheetPrice: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  ntrPaperPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  ntrSheetPrice: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  bindingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  bagType: {
    type: String,
    enum: ["normal_bag", "photo_bag"],
    required: true,
  },
  bagPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  serviceTax: {
    type: Number,
    min: 0,
  },
  deliveryCharge: {
    type: Number,
    required: true,
    min: 0,
    default: 110,
  },
  // Premium pricing fields
  premiumGlossyPaperPrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  premiumGlossySheetPrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  premiumNtrPaperPrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  premiumNtrSheetPrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  premiumBindingPrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  premiumBagPrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  // User-specific pricing fields
  userGlossyPaperPrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  userGlossySheetPrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  userNtrPaperPrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  userNtrSheetPrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  userBindingPrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  userBagPrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  userDeliveryCharge: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  // User-specific pricing as an array of objects
  userSpecificPrices: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    glossyPaperPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    glossySheetPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    ntrPaperPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    ntrSheetPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    bindingPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    bagPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    deliveryCharge: {
      type: Number,
      min: 0,
      default: 0,
    },
  }],
}, {
  timestamps: true,
});

const Price = mongoose.model("Price", priceSchema);

export default Price;
