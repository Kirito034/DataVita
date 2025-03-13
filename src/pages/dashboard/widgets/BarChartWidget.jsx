import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const BarChartWidget = ({ data }) => {
  // Use provided data or fallback to default
  const chartData = data || [
    { name: "North", value: 65 },
    { name: "South", value: 40 },
    { name: "East", value: 80 },
    { name: "West", value: 55 },
    { name: "Central", value: 95 },
    { name: "Other", value: 60 },
  ]

  return (
    <div className="db-chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="name" tick={{ fill: "#666", fontSize: 12 }} axisLine={{ stroke: "#ddd" }} />
          <YAxis tick={{ fill: "#666", fontSize: 12 }} axisLine={{ stroke: "#ddd" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="value" fill="#666" radius={[2, 2, 0, 0]} name="Sales ($K)" animationDuration={300} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default BarChartWidget

