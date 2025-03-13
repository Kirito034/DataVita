import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const LineChartWidget = ({ data }) => {
  // Use provided data or fallback to default
  const chartData = data || [
    { name: "Jan", value: 30 },
    { name: "Feb", value: 50 },
    { name: "Mar", value: 45 },
    { name: "Apr", value: 70 },
    { name: "May", value: 65 },
    { name: "Jun", value: 80 },
    { name: "Jul", value: 90 },
    { name: "Aug", value: 85 },
    { name: "Sep", value: 95 },
    { name: "Oct", value: 100 },
    { name: "Nov", value: 110 },
    { name: "Dec", value: 105 },
  ]

  return (
    <div className="db-chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
          <Line
            type="monotone"
            dataKey="value"
            stroke="#666"
            activeDot={{ r: 6 }}
            strokeWidth={2}
            name="Revenue ($K)"
            dot={{ stroke: "#666", strokeWidth: 1, r: 3, fill: "#fff" }}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default LineChartWidget

