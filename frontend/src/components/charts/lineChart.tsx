import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Define the options type
const options: ChartOptions<"line"> = {
  responsive: false,
  interaction: {
    mode: "index",
    intersect: false,
  },
  plugins: {
    title: {
      display: true,
      text: "Chart.js Line Chart - Multi Axis",
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
  labels
) => ({
  labels,
  datasets: [
    {
      label: "",
      data: y1,
      borderColor: "rgb(255, 99, 132)",
      backgroundColor: "rgba(255, 99, 132, 0.5)",
      yAxisID: "y",
      tension: 0.4, // Smooth line
      pointRadius: 0, // Remove points
    },
  ],
});

// Define the LineChart component with types
type LineChartProps = {
  x: number[];
  y1: number[];
};

export function LineChart({ x, y1 }: LineChartProps) {
  const chartData = data(y1, x);

  return <Line options={options} data={chartData} />;
}
