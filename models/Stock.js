import mongoose from "mongoose";

const stockSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  productCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  // Paper-specific fields
  paperType: {
    type: String,
    required: true,
    enum: ["glossy", "ntr", "matte", "luster", "silk", "metallic", "canvas", "other"],
    default: "glossy",
  },
  paperSize: {
    type: String,
    required: true, // e.g., 4x6, 5x7, 12x36, A4
    trim: true,
  },
  brand: {
    type: String,
    trim: true,
    default: "",
  },
  gsm: {
    type: Number,
    min: 0,
    default: 0,
  },
  finish: {
    type: String,
    trim: true,
    default: "",
  },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  unit: {
    type: String,
    required: true,
    enum: ["sheets", "packs"],
    default: "sheets",
  },
  sheetsPerPack: {
    type: Number,
    min: 1,
    default: 100,
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0,
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  supplier: {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    contact: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
  },
  location: {
    warehouse: {
      type: String,
      trim: true,
      default: "",
    },
    shelf: {
      type: String,
      trim: true,
      default: "",
    },
    section: {
      type: String,
      trim: true,
      default: "",
    },
  },
  reorderLevel: {
    type: Number,
    min: 0,
    default: 10,
  },
  reorderQuantity: {
    type: Number,
    min: 0,
    default: 50,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "discontinued"],
    default: "active",
  },
  tags: [{
    type: String,
    trim: true,
  }],
  images: [{
    type: String,
    trim: true,
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for profit margin
stockSchema.virtual('profitMargin').get(function() {
  if (this.purchasePrice > 0) {
    return ((this.sellingPrice - this.purchasePrice) / this.purchasePrice * 100).toFixed(2);
  }
  return 0;
});

// Virtuals
// Total monetary value of current stock based on unit
stockSchema.virtual('totalValue').get(function() {
  return this.quantity * this.sellingPrice;
});

// Sheets in stock regardless of current unit
stockSchema.virtual('sheetsInStock').get(function() {
  if (this.unit === 'sheets') return this.quantity;
  return this.quantity * (this.sheetsPerPack || 1);
});

// Virtual for stock status
stockSchema.virtual('stockStatus').get(function() {
  if (this.quantity === 0) return 'out_of_stock';
  if (this.quantity <= this.reorderLevel) return 'low_stock';
  return 'in_stock';
});

// Index for better query performance
stockSchema.index({ productName: 'text', productCode: 'text' });
stockSchema.index({ paperType: 1, paperSize: 1 });
stockSchema.index({ status: 1, paperType: 1 });
stockSchema.index({ quantity: 1 });

const Stock = mongoose.model("Stock", stockSchema);
export default Stock;
