import Price from "../models/Price.js";

// @desc    Create a new price entry
// @route   POST /api/prices
// @access  Admin
export const createPrice = async (req, res) => {
  try {
    const { albumType, userType, glossyPaperPrice, ntrPaperPrice, bindingPrice } = req.body;

    if (!albumType || !userType || glossyPaperPrice == null || ntrPaperPrice == null || bindingPrice == null) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await Price.findOne({ albumType, userType });
    if (existing) {
      return res.status(400).json({ message: "Price entry already exists for this combination" });
    }

    const price = await Price.create({
      albumType,
      userType,
      glossyPaperPrice,
      ntrPaperPrice,
      bindingPrice
    });

    res.status(201).json(price);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get all prices
// @route   GET /api/prices
export const getAllPrices = async (req, res) => {
  try {
    const prices = await Price.find().sort({ userType: 1, albumType: 1 });
    res.json(prices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get price by ID
// @route   GET /api/prices/:id
export const getPriceById = async (req, res) => {
  try {
    const price = await Price.findById(req.params.id);
    if (!price) return res.status(404).json({ message: "Price not found" });
    res.json(price);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update price
// @route   PUT /api/prices/:id
// @access  Admin
export const updatePrice = async (req, res) => {
  try {
    const { glossyPaperPrice, ntrPaperPrice, bindingPrice } = req.body;
    const price = await Price.findById(req.params.id);

    if (!price) return res.status(404).json({ message: "Price not found" });

    price.glossyPaperPrice = glossyPaperPrice ?? price.glossyPaperPrice;
    price.ntrPaperPrice = ntrPaperPrice ?? price.ntrPaperPrice;
    price.bindingPrice = bindingPrice ?? price.bindingPrice;

    const updated = await price.save();
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete price
// @route   DELETE /api/prices/:id
// @access  Admin
export const deletePrice = async (req, res) => {
  try {
    const price = await Price.findById(req.params.id);
    if (!price) return res.status(404).json({ message: "Price not found" });

    await price.deleteOne();
    res.json({ message: "Price deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
