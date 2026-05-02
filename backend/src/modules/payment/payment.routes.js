const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const { upload } = require("../../middlewares/upload.middleware");
const { pay, confirm, verify, getPayment, listPayments, updateProof } = require("./payment.controller");
const router = express.Router();

router.get("/admin", requireAuth, requireRole("admin"), listPayments);
router.post("/pay", requireAuth, upload.single("proof_image"), pay);
router.post("/confirm", requireAuth, confirm);
router.post("/:id/verify", requireAuth, requireRole("admin"), verify);
router.get("/:id", requireAuth, getPayment);
router.patch("/proof", requireAuth, upload.single("proof_image"), updateProof);


module.exports = router;