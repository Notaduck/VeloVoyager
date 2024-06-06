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
  responsive: true,
  interaction: {
    mode: "index" as const,
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
      type: "linear" as const,
      ticks: {
        stepSize: 5,
      },
    },
    y: {
      type: "linear" as const,
      display: true,
      position: "left" as const,
      min: 0,
      max: 30,
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
const data = (y1: number[], labels: number[]): ChartData<"line"> => ({
  labels,
  datasets: [
    {
      label: "Dataset 2",
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
  console.log("x", x.length);
  console.log("y", y1.length);

  const chartData = data(y1, x);

  return <Line options={options} data={chartData} />;
}
