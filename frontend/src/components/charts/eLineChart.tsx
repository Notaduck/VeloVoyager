import { FC } from "react";
import ReactECharts from "echarts-for-react";

type Props = {
  x: number[];
  xLabel: string;
  y: number[];
  yLabel: string;
  title: string;
  syncGroup: number; // Add a syncGroup prop to group synced charts
};

export const ELineChart: FC<Props> = ({ y, x, xLabel, yLabel }) => {
  const options = {
    grid: { top: 8, right: 8, bottom: 24, left: 36 },
    xAxis: {
      type: "category",
      data: x,
      axisLabel: {
        formatter: function (value: number) {
          console.log(value);
          return value === null ? value + "km" : "";
        },
      },
      min: 0,
      max: x.length,
      name: xLabel, // Set the x-axis label
    },
    yAxis: {
      type: "value",
      name: yLabel, // Set the y-axis label
      axisLabel: {
        formatter: function (value: number) {
          return value + yLabel;
        },
      },
    },
    series: [
      {
        data: y,
        type: "line",
        smooth: true,
      },
    ],
    tooltip: {
      trigger: "axis",
    },
  };

  return <ReactECharts option={options} />;
};
