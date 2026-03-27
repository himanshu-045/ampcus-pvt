const Product = require("../models/Product");

// ── Helper: detect platform ───────────────────────────────
const detectPlatform = (url) => {
  const u = url.toLowerCase();
  if (u.includes("amazon"))   return "amazon";
  if (u.includes("flipkart")) return "flipkart";
  if (u.includes("myntra"))   return "myntra";
  if (u.includes("meesho"))   return "meesho";
  if (u.includes("snapdeal")) return "snapdeal";
  return "other";
};

// ── Helper: generate mock price history ──────────────────
// In production, replace this with actual scraping logic
const generateMockHistory = (basePrice, months = 12) => {
  const history = [];
  const now = new Date();
  const totalDays = months * 30;

  for (let i = totalDays; i >= 0; i -= 3) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Simulate realistic price fluctuation ±15%
    const fluctuation = (Math.random() - 0.5) * 0.3;
    // Add seasonal trends
    const month = date.getMonth();
    const seasonal = month === 10 || month === 11 ? -0.08 : // Nov/Dec sales
                     month === 0  ? 0.05  : // Jan post-sale
                     month === 6  ? -0.05 : // July sale
                     0;

    const price = Math.round(basePrice * (1 + fluctuation + seasonal));
    history.push({ price: Math.max(price, basePrice * 0.6), recordedAt: date });
  }

  return history;
};

// ── Helper: mock scrape product info ────────────────────
// In production: use puppeteer/cheerio/scraping API
const mockScrapeProduct = (url, manualName, manualPrice) => {
  const platform = detectPlatform(url);

  const mockProducts = {
    amazon: {
      name: manualName || "Amazon Product",
      currentPrice: manualPrice || Math.floor(Math.random() * 80000) + 5000,
      image: "https://via.placeholder.com/200x200/0b1219/00ffb4?text=Amazon",
    },
    flipkart: {
      name: manualName || "Flipkart Product",
      currentPrice: manualPrice || Math.floor(Math.random() * 60000) + 3000,
      image: "https://via.placeholder.com/200x200/0b1219/00bfff?text=Flipkart",
    },
    myntra: {
      name: manualName || "Myntra Product",
      currentPrice: manualPrice || Math.floor(Math.random() * 10000) + 500,
      image: "https://via.placeholder.com/200x200/0b1219/ff5e5e?text=Myntra",
    },
    other: {
      name: manualName || "Tracked Product",
      currentPrice: manualPrice || Math.floor(Math.random() * 50000) + 1000,
      image: "https://via.placeholder.com/200x200/0b1219/ffa500?text=Product",
    },
  };

  return mockProducts[platform] || mockProducts.other;
};

// ── Helper: analyze best time to buy ────────────────────
const analyzeBestTimeToBuy = (priceHistory, currentPrice) => {
  if (!priceHistory || priceHistory.length < 7) {
    return { recommendation: "insufficient_data", message: "Not enough data yet. Check back in a few days." };
  }

  const prices = priceHistory.map(p => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  // Recent trend (last 7 data points)
  const recent = prices.slice(-7);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const trend = recentAvg > avgPrice ? "rising" : recentAvg < avgPrice ? "falling" : "stable";

  const pctFromMin = ((currentPrice - minPrice) / minPrice) * 100;
  const pctFromAvg = ((currentPrice - avgPrice) / avgPrice) * 100;

  let recommendation, message, score;

  if (currentPrice <= minPrice * 1.03) {
    recommendation = "buy_now";
    message = "🔥 This is near the all-time low price! Best time to buy.";
    score = 95;
  } else if (currentPrice <= avgPrice * 0.95) {
    recommendation = "buy_now";
    message = "✅ Price is below average. Good time to buy.";
    score = 80;
  } else if (trend === "falling" && pctFromMin < 20) {
    recommendation = "wait";
    message = "📉 Price is falling. Wait a few more days for a better deal.";
    score = 40;
  } else if (currentPrice >= maxPrice * 0.92) {
    recommendation = "wait";
    message = "⚠️ Price is near its peak. Wait for a sale or discount.";
    score = 20;
  } else if (trend === "rising") {
    recommendation = "buy_soon";
    message = "📈 Price is rising. Buy soon before it goes higher.";
    score = 65;
  } else {
    recommendation = "buy_soon";
    message = "💡 Price is average. Consider buying if you need it now.";
    score = 55;
  }

  return {
    recommendation,
    message,
    score,
    stats: {
      currentPrice,
      minPrice,
      maxPrice,
      avgPrice: Math.round(avgPrice),
      trend,
      pctFromMin: Math.round(pctFromMin),
      pctFromAvg: Math.round(pctFromAvg),
    },
  };
};

// ── ADD PRODUCT ──────────────────────────────────────────
const addProduct = async (req, res) => {
  try {
    const { url, name, currentPrice, targetPrice } = req.body;

    if (!url) return res.status(400).json({ success: false, message: "Product URL is required." });
    if (!name) return res.status(400).json({ success: false, message: "Product name is required." });
    if (!currentPrice) return res.status(400).json({ success: false, message: "Current price is required." });

    // Check duplicate for this user
    const existing = await Product.findOne({ user: req.user._id, url });
    if (existing) return res.status(409).json({ success: false, message: "You are already tracking this product." });

    const scraped = mockScrapeProduct(url, name, parseFloat(currentPrice));
    const history = generateMockHistory(scraped.currentPrice, 12);

    const product = await Product.create({
      user: req.user._id,
      url,
      name: scraped.name,
      platform: detectPlatform(url),
      image: scraped.image,
      currentPrice: scraped.currentPrice,
      originalPrice: scraped.currentPrice,
      targetPrice: targetPrice ? parseFloat(targetPrice) : null,
      priceHistory: history,
      lastChecked: new Date(),
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    console.error("Add product error:", err);
    res.status(500).json({ success: false, message: "Server error adding product." });
  }
};

// ── GET ALL PRODUCTS ─────────────────────────────────────
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ user: req.user._id, isActive: true })
      .select("-priceHistory")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: products.length, products });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error fetching products." });
  }
};

// ── GET SINGLE PRODUCT WITH HISTORY ─────────────────────
const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, user: req.user._id });
    if (!product) return res.status(404).json({ success: false, message: "Product not found." });

    const analysis = analyzeBestTimeToBuy(product.priceHistory, product.currentPrice);

    res.json({ success: true, product, analysis });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── DELETE PRODUCT ───────────────────────────────────────
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!product) return res.status(404).json({ success: false, message: "Product not found." });
    res.json({ success: true, message: "Product removed from tracking." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── REFRESH PRICE (simulate price check) ─────────────────
const refreshPrice = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, user: req.user._id });
    if (!product) return res.status(404).json({ success: false, message: "Product not found." });

    // Simulate new price ±5% from current
    const change = (Math.random() - 0.5) * 0.10;
    const newPrice = Math.round(product.currentPrice * (1 + change));

    product.priceHistory.push({ price: newPrice, recordedAt: new Date() });
    product.currentPrice = newPrice;
    product.lastChecked = new Date();
    await product.save();

    const analysis = analyzeBestTimeToBuy(product.priceHistory, newPrice);
    res.json({ success: true, newPrice, analysis, message: "Price refreshed successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = { addProduct, getProducts, getProduct, deleteProduct, refreshPrice };
