"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Doughnut = dynamic(() => import('react-chartjs-2').then((m) => m.Doughnut), { ssr: false });

export interface DonutChartProps {
  labels: string[];
  values: number[];
  colors: string[];
}

export default function DonutChart({ labels, values, colors }: DonutChartProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    import('chart.js/auto').then(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return null;
  }

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderColor: 'rgba(0,0,0,0)',
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const options: any = {
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${ctx.formattedValue}`,
        },
      },
    },
    cutout: '70%',
    maintainAspectRatio: false,
  };

  return (
    <div className="h-56">
      {/* @ts-ignore */}
      <Doughnut data={data} options={options} />
    </div>
  );
}


