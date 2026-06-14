const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const { env } = require("./config/env");
const apiV1Router = require("./routes");
const { notFound, errorHandler } = require("./middlewares/error.middleware");

const app = express();

// If behind a reverse proxy (NGINX, Render, etc.)
app.set("trust proxy", env.TRUST_PROXY);

app.use(helmet());
app.use(cors(env.CORS_OPTIONS));
app.use(morgan(env.MORGAN_FORMAT));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", apiV1Router);

app.use(notFound);
app.use(errorHandler);

module.exports = { app };
