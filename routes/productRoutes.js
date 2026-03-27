const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  addProduct,
  getProducts,
  getProduct,
  deleteProduct,
  refreshPrice,
} = require("../controllers/productController");

const router = express.Router();

// All routes protected
router.use(protect);

router.get("/",          getProducts);
router.post("/",         addProduct);
router.get("/:id",       getProduct);
router.delete("/:id",    deleteProduct);
router.post("/:id/refresh", refreshPrice);

module.exports = router;
