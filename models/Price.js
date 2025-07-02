import mongoose from "mongoose";

const priceSchema = new mongoose.Schema({
  albumType: {
    type: String,
    enum: ["print", "print_design"],
    required: true,
  },
  userType: {
    type: String,
    enum: ["user", "admin", "retailer", "professional"],
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
}, {
  timestamps: true,
});

const Price = mongoose.model("Price", priceSchema);

export default Price;
