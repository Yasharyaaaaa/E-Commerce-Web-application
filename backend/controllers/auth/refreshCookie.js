// Shared cookie options for the httpOnly refresh-token cookie, so login,
// refresh, and logout all agree on the same attributes.
export const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
