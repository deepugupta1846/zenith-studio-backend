import Stock from "../models/Stock.js";

// @desc    Create new stock item
// @route   POST /api/stock
// @access  Private
export const createStock = async (req, res) => {
  try {
    const {
      productName,
      productCode,
      paperType,
      paperSize,
      brand,
      gsm,
      finish,
      description,
      quantity,
      unit,
      sheetsPerPack,
      purchasePrice,
      sellingPrice,
      supplier,
      location,
      reorderLevel,
      reorderQuantity,
      tags,
      images,
    } = req.body;

    // Check if product code already exists
    const existingStock = await Stock.findOne({ productCode });
    if (existingStock) {
      return res.status(400).json({ message: "Product code already exists" });
    }

    const stockData = {
      productName,
      productCode,
      paperType,
      paperSize,
      brand,
      gsm,
      finish,
      description,
      quantity,
      unit,
      sheetsPerPack,
      purchasePrice,
      sellingPrice,
      supplier,
      location,
      reorderLevel,
      reorderQuantity,
      tags,
      images,
      createdBy: req.user._id,
      lastUpdatedBy: req.user._id,
    };

    const stock = await Stock.create(stockData);
    await stock.populate('createdBy', 'name email');
    await stock.populate('lastUpdatedBy', 'name email');

    res.status(201).json({
      message: "Stock item created successfully",
      stock,
    });
  } catch (error) {
    console.error("Create stock error:", error);
    res.status(500).json({ message: "Failed to create stock item" });
  }
};

// @desc    Get all stock items with pagination and filters
// @route   GET /api/stock
// @access  Private
export const getAllStock = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      paperType,
      paperSize,
      brand,
      status,
      minGsm,
      maxGsm,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: "i" } },
        { productCode: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { paperSize: { $regex: search, $options: "i" } },
        { paperType: { $regex: search, $options: "i" } },
      ];
    }

    // Paper filters
    if (paperType) query.paperType = paperType;
    if (paperSize) query.paperSize = paperSize;
    if (brand) query.brand = { $regex: brand, $options: "i" };

    // Status filter
    if (status) {
      query.status = status;
    }

    // GSM range filter
    if (minGsm || maxGsm) {
      query.gsm = {};
      if (minGsm) query.gsm.$gte = parseFloat(minGsm);
      if (maxGsm) query.gsm.$lte = parseFloat(maxGsm);
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.sellingPrice = {};
      if (minPrice) query.sellingPrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.sellingPrice.$lte = parseFloat(maxPrice);
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const stocks = await Stock.find(query)
      .populate("createdBy", "name email")
      .populate("lastUpdatedBy", "name email")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Stock.countDocuments(query);

    res.status(200).json({
      stocks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get all stock error:", error);
    res.status(500).json({ message: "Failed to fetch stock items" });
  }
};

// @desc    Get single stock item by ID
// @route   GET /api/stock/:id
// @access  Private
export const getStockById = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("lastUpdatedBy", "name email");

    if (!stock) {
      return res.status(404).json({ message: "Stock item not found" });
    }

    res.status(200).json({ stock });
  } catch (error) {
    console.error("Get stock by ID error:", error);
    res.status(500).json({ message: "Failed to fetch stock item" });
  }
};

// @desc    Update stock item
// @route   PUT /api/stock/:id
// @access  Private
export const updateStock = async (req, res) => {
  try {
    const {
      productName,
      productCode,
      paperType,
      paperSize,
      brand,
      gsm,
      finish,
      description,
      quantity,
      unit,
      sheetsPerPack,
      purchasePrice,
      sellingPrice,
      supplier,
      location,
      reorderLevel,
      reorderQuantity,
      status,
      tags,
      images,
    } = req.body;

    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ message: "Stock item not found" });
    }

    // Check if product code already exists (if changed)
    if (productCode && productCode !== stock.productCode) {
      const existingStock = await Stock.findOne({ productCode });
      if (existingStock) {
        return res.status(400).json({ message: "Product code already exists" });
      }
    }

    const updateData = {
      productName,
      productCode,
      paperType,
      paperSize,
      brand,
      gsm,
      finish,
      description,
      quantity,
      unit,
      sheetsPerPack,
      purchasePrice,
      sellingPrice,
      supplier,
      location,
      reorderLevel,
      reorderQuantity,
      status,
      tags,
      images,
      lastUpdatedBy: req.user._id,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const updatedStock = await Stock.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name email")
      .populate("lastUpdatedBy", "name email");

    res.status(200).json({
      message: "Stock item updated successfully",
      stock: updatedStock,
    });
  } catch (error) {
    console.error("Update stock error:", error);
    res.status(500).json({ message: "Failed to update stock item" });
  }
};

// @desc    Delete stock item
// @route   DELETE /api/stock/:id
// @access  Private
export const deleteStock = async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ message: "Stock item not found" });
    }

    await Stock.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Stock item deleted successfully" });
  } catch (error) {
    console.error("Delete stock error:", error);
    res.status(500).json({ message: "Failed to delete stock item" });
  }
};

// @desc    Update stock quantity (for sales/purchases)
// @route   PATCH /api/stock/:id/quantity
// @access  Private
export const updateStockQuantity = async (req, res) => {
  try {
    const { quantity, operation, reason } = req.body; // operation: 'add' or 'subtract'

    if (!quantity || !operation || !reason) {
      return res.status(400).json({ 
        message: "Quantity, operation, and reason are required" 
      });
    }

    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ message: "Stock item not found" });
    }

    let newQuantity;
    if (operation === "add") {
      newQuantity = stock.quantity + parseInt(quantity);
    } else if (operation === "subtract") {
      newQuantity = stock.quantity - parseInt(quantity);
      if (newQuantity < 0) {
        return res.status(400).json({ 
          message: "Insufficient stock quantity" 
        });
      }
    } else {
      return res.status(400).json({ 
        message: "Invalid operation. Use 'add' or 'subtract'" 
      });
    }

    stock.quantity = newQuantity;
    stock.lastUpdatedBy = req.user._id;
    await stock.save();

    await stock.populate("createdBy", "name email");
    await stock.populate("lastUpdatedBy", "name email");

    res.status(200).json({
      message: "Stock quantity updated successfully",
      stock,
      operation,
      quantityChanged: parseInt(quantity),
      reason,
    });
  } catch (error) {
    console.error("Update stock quantity error:", error);
    res.status(500).json({ message: "Failed to update stock quantity" });
  }
};

// @desc    Get low stock alerts
// @route   GET /api/stock/alerts/low-stock
// @access  Private
export const getLowStockAlerts = async (req, res) => {
  try {
    const lowStockItems = await Stock.find({
      $expr: { $lte: ["$quantity", "$reorderLevel"] },
      status: "active",
    })
      .populate("createdBy", "name email")
      .populate("lastUpdatedBy", "name email");

    res.status(200).json({
      message: "Low stock alerts retrieved successfully",
      count: lowStockItems.length,
      items: lowStockItems,
    });
  } catch (error) {
    console.error("Get low stock alerts error:", error);
    res.status(500).json({ message: "Failed to fetch low stock alerts" });
  }
};

// @desc    Get expired stock alerts
// @route   GET /api/stock/alerts/expired
// @access  Private
export const getExpiredStockAlerts = async (req, res) => {
  try {
    // Paper stock typically doesn't expire. Returning empty list.
    res.status(200).json({
      message: "Expired stock alerts retrieved successfully",
      count: 0,
      items: [],
    });
  } catch (error) {
    console.error("Get expired stock alerts error:", error);
    res.status(500).json({ message: "Failed to fetch expired stock alerts" });
  }
};

// @desc    Get stock analytics
// @route   GET /api/stock/analytics
// @access  Private
export const getStockAnalytics = async (req, res) => {
  try {
    const totalItems = await Stock.countDocuments();
    const activeItems = await Stock.countDocuments({ status: "active" });
    const outOfStockItems = await Stock.countDocuments({ quantity: 0 });
    const lowStockItems = await Stock.countDocuments({
      $expr: { $lte: ["$quantity", "$reorderLevel"] },
      quantity: { $gt: 0 },
    });

    // Total inventory value
    const totalValue = await Stock.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ["$quantity", "$sellingPrice"] } },
        },
      },
    ]);

    // Paper type distribution
    const paperTypeDistribution = await Stock.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: "$paperType",
          count: { $sum: 1 },
          totalValue: { $sum: { $multiply: ["$quantity", "$sellingPrice"] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Top selling items (by value)
    const topItems = await Stock.find({ status: "active" })
      .sort({ sellingPrice: -1 })
      .limit(10)
      .select("productName productCode paperType paperSize sellingPrice quantity");

    res.status(200).json({
      message: "Stock analytics retrieved successfully",
      analytics: {
        totalItems,
        activeItems,
        outOfStockItems,
        lowStockItems,
        totalValue: totalValue[0]?.totalValue || 0,
        paperTypeDistribution,
        topItems,
      },
    });
  } catch (error) {
    console.error("Get stock analytics error:", error);
    res.status(500).json({ message: "Failed to fetch stock analytics" });
  }
};

// @desc    Bulk update stock
// @route   POST /api/stock/bulk-update
// @access  Private
export const bulkUpdateStock = async (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, quantity, operation, reason }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "Updates array is required" });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { id, quantity, operation, reason } = update;

        const stock = await Stock.findById(id);
        if (!stock) {
          errors.push({ id, error: "Stock item not found" });
          continue;
        }

        let newQuantity;
        if (operation === "add") {
          newQuantity = stock.quantity + parseInt(quantity);
        } else if (operation === "subtract") {
          newQuantity = stock.quantity - parseInt(quantity);
          if (newQuantity < 0) {
            errors.push({ id, error: "Insufficient stock quantity" });
            continue;
          }
        } else {
          errors.push({ id, error: "Invalid operation" });
          continue;
        }

        stock.quantity = newQuantity;
        stock.lastUpdatedBy = req.user._id;
        await stock.save();

        results.push({
          id,
          productName: stock.productName,
          oldQuantity: stock.quantity - parseInt(quantity),
          newQuantity: stock.quantity,
          operation,
          reason,
        });
      } catch (error) {
        errors.push({ id: update.id, error: error.message });
      }
    }

    res.status(200).json({
      message: "Bulk update completed",
      results,
      errors,
      summary: {
        successful: results.length,
        failed: errors.length,
      },
    });
  } catch (error) {
    console.error("Bulk update stock error:", error);
    res.status(500).json({ message: "Failed to perform bulk update" });
  }
};

// @desc    Export stock data
// @route   GET /api/stock/export
// @access  Private
export const exportStock = async (req, res) => {
  try {
    const { format = "json", paperType, paperSize, status } = req.query;

    const query = {};
    if (paperType) query.paperType = paperType;
    if (paperSize) query.paperSize = paperSize;
    if (status) query.status = status;

    const stocks = await Stock.find(query)
      .populate("createdBy", "name email")
      .populate("lastUpdatedBy", "name email")
      .lean();

    if (format === "csv") {
      // Convert to CSV format
      const csvData = stocks.map(stock => ({
        "Product Name": stock.productName,
        "Product Code": stock.productCode,
        "Paper Type": stock.paperType,
        "Paper Size": stock.paperSize,
        "Brand": stock.brand || "",
        "GSM": stock.gsm || 0,
        "Quantity": stock.quantity,
        "Unit": stock.unit,
        "Sheets Per Pack": stock.sheetsPerPack || 0,
        "Purchase Price": stock.purchasePrice,
        "Selling Price": stock.sellingPrice,
        "Status": stock.status,
        "Created At": new Date(stock.createdAt).toLocaleDateString(),
      }));

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=stock-export.csv");
      
      // Convert to CSV string
      const csvString = [
        Object.keys(csvData[0]).join(","),
        ...csvData.map(row => Object.values(row).join(","))
      ].join("\n");

      res.send(csvString);
    } else {
      res.status(200).json({
        message: "Stock data exported successfully",
        count: stocks.length,
        data: stocks,
      });
    }
  } catch (error) {
    console.error("Export stock error:", error);
    res.status(500).json({ message: "Failed to export stock data" });
  }
};
