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
    required: true,
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
}, {
  timestamps: true,
});

const Price = mongoose.model("Price", priceSchema);

export default Price;
