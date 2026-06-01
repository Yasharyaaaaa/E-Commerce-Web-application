import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Package, ShoppingBag, IndianRupee, TrendingUp, Percent } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import api from "../../utils/api";

// ── helpers ──────────────────────────────────────────────────────────────────
const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const shortDate = (d) => { const [, m, day] = d.split("-"); return `${day}/${m}`; };

const STATUS_COLORS = {
  processing: "#f59e0b",
  shipped:    "#3b82f6",
  delivered:  "#22c55e",
  cancelled:  "#ef4444",
  unknown:    "#9ca3af",
};

const StatCard = ({ icon: Icon, label, value, sub, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white rounded-[20px] p-6 border border-gray-100 space-y-4"
  >
    <div className="flex items-center justify-between">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
        <TrendingUp size={11} />
        Live
      </span>
    </div>
    <div>
      <p className="text-3xl font-black tracking-tighter">{value}</p>
      <p className="text-sm font-bold text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  </motion.div>
);

const ChartCard = ({ title, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white rounded-[20px] border border-gray-100 p-6"
  >
    <h2 className="font-black uppercase tracking-tight text-sm mb-4">{title}</h2>
    {children}
  </motion.div>
);

const EmptyState = ({ label }) => (
  <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">{label}</div>
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/analytics/v1/overview")
      .then(({ data }) => setData(data.data))
      .catch((err) => console.error("Analytics fetch error:", err?.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  const t = data?.totals;
  const hasOrders = (t?.totalOrders ?? 0) > 0;

  const cards = [
    { icon: IndianRupee, label: "Revenue",        value: loading ? "—" : inr(t?.revenue), color: "bg-green-500",  sub: "Completed payments",                       delay: 0 },
    { icon: ShoppingBag, label: "Paid Orders",    value: loading ? "—" : (t?.paidOrders ?? 0), color: "bg-orange-500", sub: loading ? "" : `${t?.totalOrders ?? 0} total orders`, delay: 0.05 },
    { icon: Users,       label: "Total Users",    value: loading ? "—" : (t?.users ?? 0), color: "bg-blue-500",   sub: "Registered accounts",                      delay: 0.1 },
    { icon: Percent,     label: "Conversion",     value: loading ? "—" : `${t?.conversionRate ?? 0}%`, color: "bg-purple-500", sub: "Paid / total orders",         delay: 0.15 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back. Here's what's happening.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Revenue trend */}
      <ChartCard title="Revenue — last 30 days" delay={0.2}>
        {loading ? (
          <EmptyState label="Loading…" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.revenueTrend} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#9ca3af" }} interval={4} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <Tooltip formatter={(v) => [inr(v), "Revenue"]} labelFormatter={shortDate} contentStyle={{ borderRadius: 12, border: "1px solid #f3f4f6", fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Top products + orders by status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top products" delay={0.25}>
          {loading ? (
            <EmptyState label="Loading…" />
          ) : data.topProducts.length === 0 ? (
            <EmptyState label="No sales yet — complete an order to see top products." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.topProducts} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(s) => (s.length > 16 ? s.slice(0, 16) + "…" : s)} />
                <Tooltip formatter={(v, _n, p) => [`${v} sold · ${inr(p.payload.revenue)}`, p.payload.name]} contentStyle={{ borderRadius: 12, border: "1px solid #f3f4f6", fontSize: 12 }} />
                <Bar dataKey="unitsSold" fill="#000000" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Orders by status" delay={0.3}>
          {loading ? (
            <EmptyState label="Loading…" />
          ) : !hasOrders ? (
            <EmptyState label="No orders yet." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.ordersByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {data.ordersByStatus.map((s) => (
                    <Cell key={s.status} fill={STATUS_COLORS[s.status] || STATUS_COLORS.unknown} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f3f4f6", fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, textTransform: "capitalize" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Recent orders */}
      <ChartCard title="Recent orders" delay={0.35}>
        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : data.recentOrders.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">No orders yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                  <th className="py-3 pr-4">Order</th>
                  <th className="py-3 pr-4">Customer</th>
                  <th className="py-3 pr-4">Amount</th>
                  <th className="py-3 pr-4">Payment</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs">#{o._id.slice(-6).toUpperCase()}</td>
                    <td className="py-3 pr-4 font-bold">{o.user?.username ?? "—"}</td>
                    <td className="py-3 pr-4 font-black">{inr(o.totalAmount)}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${o.paymentStatus === "completed" ? "bg-green-50 text-green-700" : o.paymentStatus === "failed" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"}`}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 capitalize text-gray-600">{o.orderStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
};

export default Dashboard;
