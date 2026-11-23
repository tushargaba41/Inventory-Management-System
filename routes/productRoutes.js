const express = require("express");
const router = express.Router();

const controller = require("../controllers/productController");
const validateObjectId = require("../middleware/validateObjectId");
const { validateCreate, validateUpdate } = require("../middleware/validateProduct");

// IMPORTANT: fixed paths (/low-stock, /summary) must be declared BEFORE "/:id",
// otherwise Express would treat the words "low-stock" and "summary" as an id.
router.get("/low-stock", controller.getLowStock);
router.get("/summary", controller.getCategorySummary);

router.route("/").get(controller.getProducts).post(validateCreate, controller.createProduct);

router
  .route("/:id")
  .get(validateObjectId, controller.getProductById)
  .put(validateObjectId, validateUpdate, controller.updateProduct)
  .delete(validateObjectId, controller.deleteProduct);

router.patch("/:id/stock", validateObjectId, controller.adjustStock);

module.exports = router;
