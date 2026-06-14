const authService = require("./auth.service");

async function register(req, res, next) {
  try {
    const { token, user } = await authService.register(req.body);
    return res.status(201).json({ token, user });
  } catch (err) {
    if (err?.statusCode) res.status(err.statusCode);
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { token, user } = await authService.login(req.body);
    return res.status(200).json({ token, user });
  } catch (err) {
    if (err?.statusCode) res.status(err.statusCode);
    return next(err);
  }
}

module.exports = { register, login };
