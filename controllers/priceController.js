import Price from "../models/Price.js";

// @desc    Create a new price entry
// @route   POST /api/prices
// @access  Admin
export const createPrice = async (req, res) => {
  try {
    const { 
      albumType, userType, glossyPaperPrice, ntrPaperPrice, bindingPrice, bagPrice, 
      bagType, serviceTax, paperSize, glossySheetPrice, ntrSheetPrice, deliveryCharge,
      // Premium pricing fields
      premiumGlossyPaperPrice, premiumGlossySheetPrice, premiumNtrPaperPrice, 
      premiumNtrSheetPrice, premiumBindingPrice, premiumBagPrice
    } = req.body;
    
    console.log("Creating price entry with data:", req.body)
    
    if (!albumType || !userType || glossyPaperPrice == null || ntrPaperPrice == null || bindingPrice == null || bagPrice == null || bagType == null || serviceTax == null || paperSize == null) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // const existing = await Price.findOne({ albumType, userType });
    // if (existing) {
    //   return res.status(400).json({ message: "Price entry already exists for this combination" });
    // }

    const price = await Price.create({
      albumType,
      userType,
      glossyPaperPrice,
      ntrPaperPrice,
      bindingPrice,
      bagPrice,
      bagType,
      serviceTax,
      paperSize,
      glossySheetPrice,
      ntrSheetPrice,
      deliveryCharge: deliveryCharge || 110,
      // Premium pricing fields
      premiumGlossyPaperPrice: premiumGlossyPaperPrice || 0,
      premiumGlossySheetPrice: premiumGlossySheetPrice || 0,
      premiumNtrPaperPrice: premiumNtrPaperPrice || 0,
      premiumNtrSheetPrice: premiumNtrSheetPrice || 0,
      premiumBindingPrice: premiumBindingPrice || 0,
      premiumBagPrice: premiumBagPrice || 0,
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
    const updates = req.body;
    const price = await Price.findById(req.params.id);

    if (!price) {
      return res.status(404).json({ message: "Price not found" });
    }

    // Apply updates dynamically
    for (let key in updates) {
      if (updates[key] !== undefined) {
        price[key] = updates[key];
      }
    }

    const updated = await price.save();
    res.json(updated);
  } catch (error) {
    console.error("Update Price Error:", error);
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

// @desc    Update premium prices for a specific price entry
// @route   PUT /api/prices/:id/premium
// @access  Admin
export const updatePremiumPrices = async (req, res) => {
  try {
    const { priceId } = req.params;
    const {
      premiumGlossyPaperPrice,
      premiumGlossySheetPrice,
      premiumNtrPaperPrice,
      premiumNtrSheetPrice,
      premiumBindingPrice,
      premiumBagPrice
    } = req.body;

    const price = await Price.findById(priceId);
    if (!price) {
      return res.status(404).json({ 
        success: false, 
        message: "Price entry not found" 
      });
    }

    // Update premium prices
    if (premiumGlossyPaperPrice !== undefined) price.premiumGlossyPaperPrice = premiumGlossyPaperPrice;
    if (premiumGlossySheetPrice !== undefined) price.premiumGlossySheetPrice = premiumGlossySheetPrice;
    if (premiumNtrPaperPrice !== undefined) price.premiumNtrPaperPrice = premiumNtrPaperPrice;
    if (premiumNtrSheetPrice !== undefined) price.premiumNtrSheetPrice = premiumNtrSheetPrice;
    if (premiumBindingPrice !== undefined) price.premiumBindingPrice = premiumBindingPrice;
    if (premiumBagPrice !== undefined) price.premiumBagPrice = premiumBagPrice;

    const updatedPrice = await price.save();

    res.status(200).json({ 
      success: true, 
      message: "Premium prices updated successfully",
      price: updatedPrice 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

// @desc    Get all prices with premium pricing information
// @route   GET /api/prices/premium
// @access  Admin
export const getAllPricesWithPremium = async (req, res) => {
  try {
    const prices = await Price.find().sort({ userType: 1, albumType: 1 });
    res.status(200).json({ success: true, prices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};