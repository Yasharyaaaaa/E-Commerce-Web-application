import asyncHandler from "../utils/asyncHandler.utils.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const ymd = (d) => d.toISOString().slice(0, 10);

// GET /api/analytics/v1/overview  (admin only)
// Platform-wide metrics computed via MongoDB aggregation — revenue, top
// products, a 30-day revenue trend, order-status breakdown, and conversion.
export const getOverview = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 29 * DAY_MS); // 30-day window (inclusive)

  const [
    revenueAgg,
    totalOrders,
    users,
    products,
    trendAgg,
    statusAgg,
    topProducts,
    recentOrders,
  ] = await Promise.all([
    // Revenue + paid-order count (only completed payments count as revenue)
    Order.aggregate([
      { $match: { paymentStatus: "completed" } },
      { $group: { _id: null, revenue: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),
    Order.countDocuments(),
    User.countDocuments(),
    Product.countDocuments(),
    // Revenue + orders per day over the last 30 days (paid only)
    Order.aggregate([
      { $match: { paymentStatus: "completed", createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Orders grouped by fulfilment status
    Order.aggregate([{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
    // Top-selling products by units sold (paid orders), with revenue
    Order.aggregate([
      { $match: { paymentStatus: "completed" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          unitsSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "username email").lean(),
  ]);

  const revenue = revenueAgg[0]?.revenue ?? 0;
  const paidOrders = revenueAgg[0]?.count ?? 0;

  // Fill gaps so the trend is a continuous 30-day series (nicer chart).
  const trendMap = new Map(trendAgg.map((d) => [d._id, d]));
  const revenueTrend = Array.from({ length: 30 }, (_, i) => {
    const key = ymd(new Date(since.getTime() + i * DAY_MS));
    const hit = trendMap.get(key);
    return { date: key, revenue: hit?.revenue ?? 0, orders: hit?.orders ?? 0 };
  });

  res.status(200).json({
    success: true,
    data: {
      totals: {
        revenue,
        paidOrders,
        totalOrders,
        users,
        products,
        // Share of orders that resulted in a completed payment.
        conversionRate: totalOrders ? Math.round((paidOrders / totalOrders) * 1000) / 10 : 0,
      },
      revenueTrend,
      ordersByStatus: statusAgg.map((s) => ({ status: s._id || "unknown", count: s.count })),
      topProducts: topProducts.map((p) => ({
        name: p._id,
        unitsSold: p.unitsSold,
        revenue: p.revenue,
      })),
      recentOrders,
    },
  });
});
