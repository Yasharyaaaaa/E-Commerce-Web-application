// Runs before any module is imported. Sets deterministic secrets so tokens
// signed in tests verify correctly, independent of the real .env.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || "test_refresh_secret";
process.env.ACCESS_EXPIRES_IN = "15m";
process.env.REFRESH_EXPIRES_IN = "7d";
process.env.PAYMENT_API_SECRET = process.env.PAYMENT_API_SECRET || "test_payment_secret";
