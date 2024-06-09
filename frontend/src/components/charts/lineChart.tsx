import React, { useState, useEffect, useRef } from "react";
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
import "chartjs-plugin-crosshair";

// Register Chart.js components and plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  {
    id: "uniqueid5", //typescript crashes without id
    afterDraw: function (chart: any, easing: any) {
      if (chart.tooltip._active && chart.tooltip._active.length) {
        const activePoint = chart.tooltip._active[0];
        const ctx = chart.ctx;
        const x = activePoint.element.x;
        const topY = chart.scales.y.top;
        const bottomY = chart.scales.y.bottom;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, bottomY);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#e23fa9";
        ctx.stroke();
        ctx.restore();
      }
    },
  }
);

// Define the LineChart component with types
type LineChartProps = {
  x: number[];
  xLabel: string;
  y: number[];
  yLabel: string;
  title: string;
  syncChart?: (chartInstance: ChartJS) => void;
};

export function LineChart({
  x,
  y,
  xLabel,
  yLabel,
  title,
  syncChart,
}: LineChartProps) {
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<ChartJS | null>(null);

  // Define the options type
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: title,
      },
      legend: {
        display: false,
      },
    },

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
    onHover: (e) => {
      console.log(e);
    },
  };

  const chartData: ChartData<"line"> = {
    labels: x,
    datasets: [
      {
        data: y, // y axis
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        yAxisID: "y",
        tension: 0.4, // Smooth line
        pointRadius: 0, // Remove points
        pointBorderWidth: 0,
        borderWidth: 1.4,
      },
    ],
  };

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 100); // Simulate a delay for loading
    return () => clearTimeout(timeout);
  }, [x, y]);

  return (
    <div className="relative w-full h-64">
      <div
        className={`absolute inset-0 ${loading ? "blur-lg" : "blur-none"} transition-all duration-500`}
      >
        <Line options={options} data={chartData} />
      </div>
    </div>
  );
}
