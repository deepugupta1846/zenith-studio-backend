import mongoose from "mongoose";

const priceSchema = new mongoose.Schema({
  albumType: {
    type: String,
    enum: ["Print only", "Design only", "Print and design both"],
    required: true,
  },
  userType: {
    type: String,
    enum: ["user", "admin", "retailer", "Professional"],
    required: true,
  },
  glossyPaperPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  ntrPaperPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  bindingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
}, {
  timestamps: true,
});

const Price = mongoose.model("Price", priceSchema);

export default Price;
