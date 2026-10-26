import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { formatINR, formatShort, formatDisplay } from "../utils/finance.js";

const AXIS = { fontSize: 12, fill: "#7b8ba0", fontFamily: '"IBM Plex Mono", monospace' };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "#12263a", color: "#e9f0ea", borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 8px 24px rgba(18,38,58,0.3)" }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{formatDisplay(label)}</div>
      {payload.filter((p) => p.value !== null && p.value !== undefined).map((p) => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="amount-cell" style={{ fontFamily: '"IBM Plex Mono", monospace' }}>{formatINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function CashFlowChart({ forecast, height = 320, showReserve = true, compareSeries = null, compareLabel = "Scenario" }) {
  const data = useMemo(() => {
    const scenByDate = new Map((compareSeries || []).map((s) => [s.date, s.close]));
    return forecast.series.map((s) => ({
      date: s.date,
      actual: s.isActual ? s.close : null,
      forecast: s.date >= forecast.today ? s.close : null,
      scenario: scenByDate.has(s.date) ? scenByDate.get(s.date) : null,
      belowReserve: s.belowReserve ? s.close : null,
    }));
  }, [forecast, compareSeries]);

  const tickInterval = Math.max(0, Math.floor(data.length / 8));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f8a84" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#0f8a84" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e3e8ee" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatShort} tick={AXIS} interval={tickInterval} axisLine={{ stroke: "#cbd5df" }} tickLine={false} />
          <YAxis tick={AXIS} tickFormatter={(v) => formatINR(v, { compact: true })} axisLine={false} tickLine={false} width={64} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={0} stroke="#cd3c3c" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: "Zero cash", position: "insideBottomRight", fontSize: 11.8, fill: "#cd3c3c" }} />
          {showReserve && (
            <ReferenceLine y={forecast.reserve} stroke="#c07f10" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: "Min reserve", position: "insideTopRight", fontSize: 11.8, fill: "#c07f10" }} />
          )}
          <Area type="monotone" dataKey="actual" name="Actual balance" stroke="#0f8a84" strokeWidth={2.2} fill="url(#cashFill)" dot={false} connectNulls={false} animationDuration={900} />
          <Line type="monotone" dataKey="forecast" name="Forecast balance" stroke="#1b3a56" strokeWidth={1.8} strokeDasharray="6 4" dot={false} connectNulls={false} animationDuration={900} />
          {compareSeries && <Line type="monotone" dataKey="scenario" name={compareLabel} stroke="#a2700e" strokeWidth={2} dot={false} connectNulls={false} animationDuration={900} />}
          <Line type="monotone" dataKey="belowReserve" name="Below reserve" stroke="none" dot={{ r: 3.5, fill: "#c04343", stroke: "#fff", strokeWidth: 1 }} legendType="circle" connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScenarioComparisonChart({
  baseline,
  scenario,
  height = 300,
  reserve,
  baselineLabel = "Live Current Scenario",
  scenarioLabel = "Changing Scenario",
}) {
  const data = useMemo(() => {
    const scenByDate = new Map(scenario.series.map((s) => [s.date, s.close]));
    return baseline.series
      .filter((s) => s.date >= baseline.today)
      .map((s) => ({ date: s.date, baseline: s.close, scenario: scenByDate.has(s.date) ? scenByDate.get(s.date) : null }));
  }, [baseline, scenario]);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="#e3e8ee" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatShort} tick={AXIS} interval={Math.max(0, Math.floor(data.length / 8))} axisLine={{ stroke: "#cbd5df" }} tickLine={false} />
          <YAxis tick={AXIS} tickFormatter={(v) => formatINR(v, { compact: true })} axisLine={false} tickLine={false} width={64} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
          <ReferenceLine y={0} stroke="#cd3c3c" strokeDasharray="6 3" />
          {reserve !== undefined && <ReferenceLine y={reserve} stroke="#c07f10" strokeDasharray="6 3" />}
          {/* Live Current Scenario: Solid Line */}
          <Line type="monotone" dataKey="baseline" name={baselineLabel} stroke="#1E293B" strokeWidth={2.4} dot={false} animationDuration={900} />
          {/* Changing Scenario with Grabbed Deal: Dotted Line */}
          <Line type="monotone" dataKey="scenario" name={scenarioLabel} stroke="#10B981" strokeWidth={2.8} strokeDasharray="6 4" dot={false} animationDuration={900} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MiniBarChart({ data, height = 200, xKey, bars, stack = false }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="#e3e8ee" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS} axisLine={{ stroke: "#cbd5df" }} tickLine={false} />
          <YAxis tick={AXIS} tickFormatter={(v) => formatINR(v, { compact: true })} axisLine={false} tickLine={false} width={58} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(18,165,160,0.06)" }} />
          {bars.map((b) => (
            <Bar key={b.key} dataKey={b.key} name={b.name} fill={b.color} radius={[4, 4, 0, 0]} stackId={stack ? "a" : undefined}>
              {b.cellColors && b.data.map((entry, i) => <Cell key={i} fill={b.cellColors[i] || b.color} />)}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
