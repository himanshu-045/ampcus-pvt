const mongoose = require("mongoose");

const pricePointSchema = new mongoose.Schema({
  price: { type: Number, required: true },
  recordedAt: { type: Date, default: Date.now },
});

const productSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    url: {
      type: String,
      required: [true, "Product URL is required"],
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    platform: {
      type: String,
      enum: ["amazon", "flipkart", "myntra", "meesho", "snapdeal", "other"],
      default: "other",
    },
    image: { type: String, default: "" },
    currentPrice: { type: Number, default: 0 },
    originalPrice: { type: Number, default: 0 },
    currency: { type: String, default: "₹" },
    targetPrice: { type: Number, default: null },
    priceHistory: [pricePointSchema],
    isActive: { type: Boolean, default: true },
    lastChecked: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Detect platform from URL
productSchema.pre("save", function (next) {
  const url = this.url.toLowerCase();
  if (url.includes("amazon"))   this.platform = "amazon";
  else if (url.includes("flipkart")) this.platform = "flipkart";
  else if (url.includes("myntra"))   this.platform = "myntra";
  else if (url.includes("meesho"))   this.platform = "meesho";
  else if (url.includes("snapdeal")) this.platform = "snapdeal";
  else this.platform = "other";
  next();
});

module.exports = mongoose.model("Product", productSchema);
