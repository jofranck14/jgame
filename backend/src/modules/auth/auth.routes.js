const express = require("express");

const { register, login } = require("./auth.controller");
const { registerSchema, loginSchema, validateBody } = require("./auth.schema");

const router = express.Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);

module.exports = router;
