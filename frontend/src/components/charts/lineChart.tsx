import { useState } from "react";
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
  Interaction,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { CrosshairPlugin, Interpolate } from "chartjs-plugin-crosshair";

Interaction.modes.interpolate = Interpolate;

ChartJS.register(
  CrosshairPlugin,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type LineChartProps = {
  x: number[];
  xLabel: string;
  y: number[];
  yLabel: string;
  title: string;
  syncGroup: number; // Add a syncGroup prop to group synced charts
};

export function LineChart({
  x,
  y,
  xLabel,
  yLabel,
  title,
  syncGroup,
}: LineChartProps) {
  const [loading, setLoading] = useState(true);

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        text: title,
      },
    },
    //   crosshair: {
    //     line: {
    //       color: "#F66",
    //       // width: 20,
    //       dashPattern: [],
    //     },
    //     sync: {
    //       enabled: true,
    //       suppressTooltips: false,
    //       group: syncGroup,
    //     },
    //     zoom: {
    //       enabled: false,
    //     },
    //     snap: {
    //       enabled: true,
    //     },
    //   },
    // },
    scales: {
      x: {
        type: "linear",
        ticks: {
          stepSize: 5,
          callback: (value: string | number) => `${value} ${xLabel}`,
        },
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        ticks: {
          stepSize: 5,
          callback: (value: string | number) => `${value} ${yLabel}`,
        },
      },
    },
  };

  const chartData: ChartData<"line"> = {
    labels: x,
    datasets: [
      {
        data: y, // y axis
        showLine: true,
        fill: true,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        interpolate: true, // Enable interpolation for this dataset,
        yAxisID: "y",
        tension: 0.4, // Smooth line
        pointRadius: 0, // Remove points
        pointBorderWidth: 0,
        borderWidth: 1.4,
      },
    ],
  };

  return (
    <div className="relative w-full h-64">
      <div
        className={`absolute inset-0 ${loading ? "xxxblur-lg" : "blur-none"} transition-all duration-500`}
      >
        <Line options={options} data={chartData} />
      </div>
    </div>
  );
}
