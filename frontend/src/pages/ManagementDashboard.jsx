import { CalendarDays, CircleDollarSign, PackageCheck, ShoppingCart } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ErrorState, Loader } from "../components/StateMessage";
import { fetchManagementReports, errorMessage } from "../services/api";
import { formatINR } from "../utils/format";

const dateLabel = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function ManagementDashboard() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setReport(await fetchManagementReports(days));
    } catch (err) {
      setError(errorMessage(err, "We couldn't load company sales reports."));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (loading && !report) return <Loader label="Loading company reports…" />;
  if (error && !report) return <ErrorState message={error} />;

  const metrics = [
    { label: "Turnover", value: formatINR(report?.turnover ?? 0), icon: CircleDollarSign, detail: `Last ${days} days` },
    { label: "Orders", value: report?.orders ?? 0, icon: ShoppingCart, detail: "Paid + cash due on delivery" },
    { label: "Units sold", value: report?.units_sold ?? 0, icon: PackageCheck, detail: "Excludes cancelled items" },
  ];

  return (
    <section className="section management-page">
      <div className="shop-head management-heading">
        <div>
          <span className="kicker">Company management</span>
          <h1>Sales &amp; turnover</h1>
          <p>Company-wide product sales and daily turnover.</p>
        </div>
        <label className="period-select">
          <CalendarDays size={17} />
          <span className="visually-hidden">Report period</span>
          <select value={days} onChange={(event) => { setLoading(true); setDays(Number(event.target.value)); }}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      <div className="stats-grid management-metrics">
        {metrics.map(({ label, value, icon: Icon, detail }) => (
          <div className="stat-card" key={label}>
            <span><Icon size={16} /> {label}</span>
            <b>{value}</b>
            <small>{detail}</small>
          </div>
        ))}
      </div>

      <section className="panel report-chart">
        <div className="report-section-heading">
          <div>
            <span className="eyebrow">Daily total</span>
            <h2>Company turnover</h2>
          </div>
          <span className="report-date-range">{dateLabel(report.start_date)} – {dateLabel(report.end_date)}</span>
        </div>
        <div className="chart-frame">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={report.daily_turnover} margin={{ top: 12, right: 18, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="turnoverFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#174a3a" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#174a3a" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--line)" />
              <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={28} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} width={76} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip labelFormatter={dateLabel} formatter={(value) => [formatINR(value), "Turnover"]} contentStyle={{ borderRadius: 12, borderColor: "var(--line)", background: "var(--surface)" }} />
              <Area type="monotone" dataKey="turnover" stroke="#174a3a" strokeWidth={2.5} fill="url(#turnoverFill)" activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {loading && <p className="report-refresh">Refreshing report…</p>}
      </section>

      <section className="panel sales-table-panel">
        <div className="report-section-heading">
          <div>
            <span className="eyebrow">Performance by item</span>
            <h2>Products sold</h2>
          </div>
          <span className="badge">{report.products.length} products</span>
        </div>
        {report.products.length === 0 ? (
          <p className="muted report-empty">No completed or cash-on-delivery sales in this period yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Product</th><th>Units sold</th><th>Sales revenue</th></tr></thead>
              <tbody>
                {report.products.map((product) => (
                  <tr key={`${product.category_slug}-${product.name}`}>
                    <td><b>{product.name}</b><small className="table-subtitle">{product.category_slug}</small></td>
                    <td>{product.units}</td>
                    <td><b>{formatINR(product.revenue)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
