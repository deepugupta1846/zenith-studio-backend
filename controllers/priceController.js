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
      premiumNtrSheetPrice, premiumBindingPrice, premiumBagPrice,
      // User-specific pricing as array
      userSpecificPrices
    } = req.body;
    
    console.log("Creating price entry with data:", req.body)
    
    if (!albumType || !userType || glossyPaperPrice == null || ntrPaperPrice == null || bindingPrice == null || bagPrice == null || bagType == null || serviceTax == null || paperSize == null) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate and clean userSpecificPrices array
    const cleanedUserSpecificPrices = [];
    if (userSpecificPrices && Array.isArray(userSpecificPrices)) {
      for (const userPrice of userSpecificPrices) {
        if (userPrice.userId && (
          userPrice.glossyPaperPrice > 0 || userPrice.glossySheetPrice > 0 ||
          userPrice.ntrPaperPrice > 0 || userPrice.ntrSheetPrice > 0 ||
          userPrice.bindingPrice > 0 || userPrice.bagPrice > 0 || userPrice.deliveryCharge > 0
        )) {
          cleanedUserSpecificPrices.push({
            userId: userPrice.userId,
            glossyPaperPrice: userPrice.glossyPaperPrice || 0,
            glossySheetPrice: userPrice.glossySheetPrice || 0,
            ntrPaperPrice: userPrice.ntrPaperPrice || 0,
            ntrSheetPrice: userPrice.ntrSheetPrice || 0,
            bindingPrice: userPrice.bindingPrice || 0,
            bagPrice: userPrice.bagPrice || 0,
            deliveryCharge: userPrice.deliveryCharge || 0,
          });
        }
      }
    }

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
      // User-specific pricing as array
      userSpecificPrices: cleanedUserSpecificPrices,
    });

    // Populate userSpecificPrices.userId before sending response
    await price.populate('userSpecificPrices.userId', 'name email userType');
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
    const prices = await Price.find({ userId: null }) // Only get base prices (no userId)
      .populate('userSpecificPrices.userId', 'name email userType')
      .sort({ userType: 1, albumType: 1 });
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
    const price = await Price.findById(req.params.id)
      .populate('userSpecificPrices.userId', 'name email userType');
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
    const { userSpecificPrices, ...otherUpdates } = req.body;
    const price = await Price.findById(req.params.id);

    if (!price) {
      return res.status(404).json({ message: "Price not found" });
    }

    // Apply updates dynamically (except userSpecificPrices)
    for (let key in otherUpdates) {
      if (otherUpdates[key] !== undefined && key !== 'userSpecificPrices') {
        price[key] = otherUpdates[key];
      }
    }

    // Handle userSpecificPrices array separately
    if (userSpecificPrices !== undefined) {
      const cleanedUserSpecificPrices = [];
      if (Array.isArray(userSpecificPrices)) {
        for (const userPrice of userSpecificPrices) {
          if (userPrice.userId && (
            userPrice.glossyPaperPrice > 0 || userPrice.glossySheetPrice > 0 ||
            userPrice.ntrPaperPrice > 0 || userPrice.ntrSheetPrice > 0 ||
            userPrice.bindingPrice > 0 || userPrice.bagPrice > 0 || userPrice.deliveryCharge > 0
          )) {
            // Check if this user already exists in the array
            const existingIndex = cleanedUserSpecificPrices.findIndex(
              up => up.userId && up.userId.toString() === userPrice.userId.toString()
            );
            
            if (existingIndex >= 0) {
              // Update existing user-specific price
              cleanedUserSpecificPrices[existingIndex] = {
                userId: userPrice.userId,
                glossyPaperPrice: userPrice.glossyPaperPrice || 0,
                glossySheetPrice: userPrice.glossySheetPrice || 0,
                ntrPaperPrice: userPrice.ntrPaperPrice || 0,
                ntrSheetPrice: userPrice.ntrSheetPrice || 0,
                bindingPrice: userPrice.bindingPrice || 0,
                bagPrice: userPrice.bagPrice || 0,
                deliveryCharge: userPrice.deliveryCharge || 0,
              };
            } else {
              // Add new user-specific price
              cleanedUserSpecificPrices.push({
                userId: userPrice.userId,
                glossyPaperPrice: userPrice.glossyPaperPrice || 0,
                glossySheetPrice: userPrice.glossySheetPrice || 0,
                ntrPaperPrice: userPrice.ntrPaperPrice || 0,
                ntrSheetPrice: userPrice.ntrSheetPrice || 0,
                bindingPrice: userPrice.bindingPrice || 0,
                bagPrice: userPrice.bagPrice || 0,
                deliveryCharge: userPrice.deliveryCharge || 0,
              });
            }
          }
        }
      }
      price.userSpecificPrices = cleanedUserSpecificPrices;
    }

    const updated = await price.save();
    await updated.populate('userSpecificPrices.userId', 'name email userType');
    res.json(updated);
  } catch (error) {
    console.error("Update Price Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update user-specific price
// @route   PUT /api/prices/user-specific/:id
// @access  Admin
export const updateUserSpecificPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      userId,
      userGlossyPaperPrice,
      userGlossySheetPrice,
      userNtrPaperPrice,
      userNtrSheetPrice,
      userBindingPrice,
      userBagPrice,
      userDeliveryCharge
    } = req.body;

    const price = await Price.findById(id);
    if (!price) {
      return res.status(404).json({
        success: false,
        message: "Price entry not found"
      });
    }

    // Update user-specific pricing fields
    if (userId !== undefined) price.userId = userId;
    if (userGlossyPaperPrice !== undefined) price.userGlossyPaperPrice = userGlossyPaperPrice;
    if (userGlossySheetPrice !== undefined) price.userGlossySheetPrice = userGlossySheetPrice;
    if (userNtrPaperPrice !== undefined) price.userNtrPaperPrice = userNtrPaperPrice;
    if (userNtrSheetPrice !== undefined) price.userNtrSheetPrice = userNtrSheetPrice;
    if (userBindingPrice !== undefined) price.userBindingPrice = userBindingPrice;
    if (userBagPrice !== undefined) price.userBagPrice = userBagPrice;
    if (userDeliveryCharge !== undefined) price.userDeliveryCharge = userDeliveryCharge;

    const updatedPrice = await price.save();

    res.status(200).json({
      success: true,
      message: "User-specific price updated successfully",
      price: updatedPrice
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
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

// @desc    Get prices for a specific user (user-specific + general prices)
// @route   GET /api/prices/user/:userId
// @access  Admin
export const getPricesForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user-specific prices first
    const userSpecificPrices = await Price.find({ 
      userId: userId,
      $or: [
        { userGlossyPaperPrice: { $gt: 0 } },
        { userGlossySheetPrice: { $gt: 0 } },
        { userNtrPaperPrice: { $gt: 0 } },
        { userNtrSheetPrice: { $gt: 0 } },
        { userBindingPrice: { $gt: 0 } },
        { userBagPrice: { $gt: 0 } }
      ]
    }).populate('userId', 'name email');

    // Get general prices (without userId)
    const generalPrices = await Price.find({ userId: null });

    res.status(200).json({ 
      success: true, 
      userSpecificPrices,
      generalPrices,
      total: userSpecificPrices.length + generalPrices.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get user-specific prices by base price ID
// @route   GET /api/prices/user-specific/by-base/:basePriceId
// @access  Admin
export const getUserSpecificPricesByBase = async (req, res) => {
  try {
    const { basePriceId } = req.params;
    
    // Get the base price to find related user-specific prices
    const basePrice = await Price.findById(basePriceId);
    if (!basePrice) {
      return res.status(404).json({
        success: false,
        message: "Base price not found"
      });
    }

    // Find user-specific prices with same albumType, userType, paperSize, bagType
    const userSpecificPrices = await Price.find({
      userId: { $exists: true, $ne: null },
      albumType: basePrice.albumType,
      userType: basePrice.userType,
      paperSize: basePrice.paperSize,
      bagType: basePrice.bagType,
      $or: [
        { userGlossyPaperPrice: { $gt: 0 } },
        { userGlossySheetPrice: { $gt: 0 } },
        { userNtrPaperPrice: { $gt: 0 } },
        { userNtrSheetPrice: { $gt: 0 } },
        { userBindingPrice: { $gt: 0 } },
        { userBagPrice: { $gt: 0 } }
      ]
    }).populate('userId', 'name email userType');

    res.status(200).json({
      success: true,
      userSpecificPrices,
      basePrice
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Create user-specific price
// @route   POST /api/prices/user-specific
// @access  Admin
export const createUserSpecificPrice = async (req, res) => {
  try {
    const {
      userId,
      albumType,
      userType,
      paperSize,
      bagType,
      userGlossyPaperPrice,
      userGlossySheetPrice,
      userNtrPaperPrice,
      userNtrSheetPrice,
      userBindingPrice,
      userBagPrice,
      userDeliveryCharge
    } = req.body;

    if (!userId || !albumType || !userType || !paperSize || !bagType) {
      return res.status(400).json({ 
        success: false, 
        message: "userId, albumType, userType, paperSize, and bagType are required" 
      });
    }

    // Check if user-specific price already exists
    const existingPrice = await Price.findOne({
      userId,
      albumType,
      userType,
      paperSize,
      bagType
    });

    if (existingPrice) {
      return res.status(400).json({
        success: false,
        message: "User-specific price already exists for this combination"
      });
    }

    const price = await Price.create({
      userId,
      albumType,
      userType,
      paperSize,
      bagType,
      // Set regular prices to 0 for user-specific pricing
      glossyPaperPrice: 0,
      ntrPaperPrice: 0,
      bindingPrice: 0,
      bagPrice: 0,
      serviceTax: 0,
      glossySheetPrice: 0,
      ntrSheetPrice: 0,
      deliveryCharge: 0,
      // User-specific prices
      userGlossyPaperPrice: userGlossyPaperPrice || 0,
      userGlossySheetPrice: userGlossySheetPrice || 0,
      userNtrPaperPrice: userNtrPaperPrice || 0,
      userNtrSheetPrice: userNtrSheetPrice || 0,
      userBindingPrice: userBindingPrice || 0,
      userBagPrice: userBagPrice || 0,
      userDeliveryCharge: userDeliveryCharge || 0,
    });

    res.status(201).json({ success: true, price });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};