import React, { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { RadarChartData } from '../../types';

interface ScoreChartProps {
  score: number;
  data: RadarChartData[];
  theme: string;
}

interface ChartColors {
    grid: string;
    tick: string;
    primary: string;
    tooltipBg: string;
    tooltipBorder: string;
}

const getChartColors = (): ChartColors => {
    const rootStyles = getComputedStyle(document.documentElement);
    return {
        grid: rootStyles.getPropertyValue('--color-border').trim(),
        tick: rootStyles.getPropertyValue('--color-text-secondary').trim(),
        primary: rootStyles.getPropertyValue('--color-primary').trim(),
        tooltipBg: rootStyles.getPropertyValue('--color-tooltip-bg').trim(),
        tooltipBorder: rootStyles.getPropertyValue('--color-tooltip-border').trim(),
    };
};


const ScoreChart: React.FC<ScoreChartProps> = ({ score, data, theme }) => {
  const getScoreColor = (s: number) => {
    if (s < 50) return 'text-danger border-danger';
    if (s < 75) return 'text-warning border-warning';
    return 'text-success border-success';
  };

  const [chartColors, setChartColors] = useState<ChartColors | null>(null);

  useEffect(() => {
      setChartColors(getChartColors());
  }, [theme]);


  return (
    <div className="flex flex-col lg:flex-row items-center justify-around gap-8 w-full">
      <div className="flex flex-col items-center justify-center">
        <h3 className="text-lg font-semibold text-text-secondary mb-2">Overall Fit Score</h3>
        <div className={`w-48 h-48 rounded-full flex items-center justify-center border-8 ${getScoreColor(score)}`}>
            <span className={`text-6xl font-bold`}>{score}%</span>
        </div>
      </div>
      <div className="w-full lg:w-1/2 h-80">
        <h3 className="text-lg font-semibold text-text-secondary mb-2 text-center">Skill Breakdown</h3>
        {chartColors ? (
            <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                <defs>
                    <radialGradient id="colorUv">
                        <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0}/>
                    </radialGradient>
                </defs>
                <PolarGrid stroke={chartColors.grid} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: chartColors.tick }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'none' }} axisLine={{ stroke: 'none' }} />
                <Radar name="Your Score" dataKey="score" stroke={chartColors.primary} fill="url(#colorUv)" fillOpacity={0.6} />
                <Tooltip
                contentStyle={{
                    backgroundColor: chartColors.tooltipBg,
                    borderColor: chartColors.tooltipBorder,
                }}
                />
                <Legend />
            </RadarChart>
            </ResponsiveContainer>
        ) : (
            <div className="flex items-center justify-center h-full">
                <p className="text-text-secondary">Loading chart...</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ScoreChart;