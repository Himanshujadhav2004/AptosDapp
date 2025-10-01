"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Bar = dynamic(() => import('react-chartjs-2').then((m) => m.Bar), { ssr: false });

export interface BarChartProps {
  labels: string[];
  values: number[];
  colors?: string[];
}

export default function BarChart({ labels, values, colors = ['#0bc3a2', '#6366f1'] }: BarChartProps) {
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
        borderRadius: 8,
      },
    ],
  };

  const options: any = {
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (ctx: any) => `${ctx.formattedValue}`,
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: '#9ca3af', font: { size: 12 } },
        grid: { display: false },
      },
      y: {
        ticks: { color: '#9ca3af', font: { size: 12 } },
        grid: { color: 'rgba(148,163,184,0.15)' },
      },
    },
  };

  return (
    <div className="h-56">
      {/* @ts-ignore */}
      <Bar data={data} options={options} />
    </div>
  );
}


