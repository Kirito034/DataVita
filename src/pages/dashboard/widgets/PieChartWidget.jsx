import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"

const PieChartWidget = ({ data }) => {
  // Use provided data or fallback to default
  const chartData = data || [
    { name: "Product A", value: 35 },
    { name: "Product B", value: 25 },
    { name: "Product C", value: 20 },
    { name: "Product D", value: 15 },
    { name: "Others", value: 5 },
  ]

  // Monochrome color palette
  const COLORS = ["#555", "#777", "#999", "#bbb", "#ddd"]

  // Custom label renderer
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180)
    const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180)

    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="db-chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius="70%"
            fill="#8884d8"
            dataKey="value"
            animationDuration={300}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`${value} units`, "Market Share"]}
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconSize={10}
            iconType="circle"
            wrapperStyle={{ fontSize: "12px", paddingLeft: "10px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PieChartWidget

