const { z } = require("zod");

const registerSchema = z.object({
  username: z.string().trim().min(3).max(50),
  phone: z.string().trim().min(6).max(20),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  phone: z.string().trim().min(6).max(20),
  password: z.string().min(1).max(72),
});

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400);
      return next(new Error(parsed.error.issues.map((i) => i.message).join("; ")));
    }
    req.body = parsed.data;
    return next();
  };
}

module.exports = { registerSchema, loginSchema, validateBody };
