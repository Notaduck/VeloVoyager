import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler, // Import Filler plugin for area charts
  ChartData,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Register Chart.js components and Filler plugin
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler, // Register Filler plugin
);

// Define the options type
const options: ChartOptions<"line"> = {
  responsive: true, // Ensure the chart is responsive
  maintainAspectRatio: false, // Disable aspect ratio to allow full width
  interaction: {
    mode: "index",
    intersect: false,
  },
  plugins: {
    title: {
      display: true,
      text: "Chart.js Area Chart - Multi Axis",
    },
  },
  scales: {
    x: {
      type: "linear",
      ticks: {
        stepSize: 5,
      },
    },
    y: {
      type: "linear",
      display: true,
      position: "left",
      ticks: {
        stepSize: 5,
        callback: function (value: string | number) {
          return value + " km";
        },
      },
    },
  },
};

// Define the data type
const data: (y1: number[], labels: number[]) => ChartData<"line"> = (
  y1,
  labels,
) => ({
  labels,
  datasets: [
    {
      label: "",
      data: y1,
      borderColor: "rgb(255, 99, 132)",
      backgroundColor: "rgba(255, 99, 132, 0.5)",
      fill: true, // Enable fill for area chart
      yAxisID: "y",
      tension: 1, // Smooth line

      pointRadius: 0, // Remove points
    },
  ],
});

// Define the LineChart component with types
type LineChartProps = {
  x: number[];
  y1: number[];
};

export function AreaChart({ x, y1 }: LineChartProps) {
  const chartData = data(y1, x);

  return (
    <div className="w-full h-64">
      <Line options={options} data={chartData} />
    </div>
  );
}
