import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Users, CheckCircle, ArrowRight } from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: string) => void;
  user: any;
}

interface DashboardData {
  totalStudents: number;
  totalDays: number;
  overall: {
    present: number;
    absent: number;
    percentage: number;
  };
  dailyTrend: Array<{
    date: string;
    present: number;
    absent: number;
  }>;
}

export default function Dashboard({ onNavigate, user: _user }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const liveDateTime = time.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) + ', ' + time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get<DashboardData>('/attendance/analytics/overview');
      setData(res);
    } catch (err: any) {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm">Assembling dashboard metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center max-w-md mx-auto">
        <div className="text-red-500 mb-2">⚠ Error Loading Dashboard</div>
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  // Calculate SVG circular stroke
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (data.overall.percentage / 100) * circumference;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Welcome & Time Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 md:p-8 shadow-xl shadow-blue-500/10">
        <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome, LR!
          </h1>
          <p className="text-blue-100 text-sm md:text-base font-light">
            Today is <strong className="font-semibold">{liveDateTime}</strong>
          </p>
        </div>
      </div>

      {/* Metric Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Total Students */}
        <div className="glass-card rounded-2xl p-5 border border-white/60 dark-theme:border-slate-800/80 shadow-sm flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark-theme:bg-blue-950/40 text-blue-600 dark-theme:text-blue-400 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-500 dark-theme:text-slate-400">Total Students</span>
            <span className="text-2xl font-bold text-slate-800 dark-theme:text-white">{data.totalStudents}</span>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="glass-card rounded-2xl p-5 border border-white/60 dark-theme:border-slate-800/80 shadow-sm flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark-theme:bg-emerald-950/40 text-emerald-600 dark-theme:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-500 dark-theme:text-slate-400">Overall Rate</span>
            <span className="text-2xl font-bold text-slate-800 dark-theme:text-white">{data.overall.percentage}%</span>
          </div>
        </div>

      </div>

      {/* Main Feature Action and Rate Analytics Ring */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Quick Launch Card */}
        <div className="md:col-span-2 relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 md:p-8 flex flex-col justify-between shadow-xl shadow-slate-950/10">
          <div className="absolute right-0 top-0 -translate-y-5 translate-x-5 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Need to mark today's roll call?</h2>
            <p className="text-slate-400 text-sm mt-2 max-w-md">
              Load today's attendance roster. Default values are pre-selected as Present. You only toggle absent students.
            </p>
          </div>
          <div className="mt-8">
            <button
              onClick={() => onNavigate('attendance')}
              className="bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white px-6 py-3 rounded-2xl font-semibold flex items-center space-x-2 transition-all shadow-lg shadow-blue-500/20 text-sm"
            >
              <span>Take Attendance Now</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Core Ring Chart */}
        <div className="glass-card rounded-3xl p-6 border border-white/60 dark-theme:border-slate-800/80 flex flex-col items-center justify-center text-center">
          <h3 className="text-sm font-bold text-slate-700 dark-theme:text-slate-300 mb-4 uppercase tracking-wider text-xs">
            Overall Attendance
          </h3>
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Circular Ring */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-slate-200 dark-theme:stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-blue-600 dark-theme:stroke-blue-500 transition-all duration-1000 ease-out"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-slate-800 dark-theme:text-white">
                {data.overall.percentage}%
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">
                Presence Rate
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Analytics Trend Area */}
      <div className="glass-card rounded-3xl p-6 border border-white/60 dark-theme:border-slate-800/80">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark-theme:text-white">Daily Attendance Trend</h3>
            <p className="text-xs text-slate-400">Visual performance of the last 10 marked days</p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-semibold">
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5"></span>Presence Rate</span>
          </div>
        </div>

        {data.dailyTrend.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No history recorded yet. Complete today's attendance to see trends.
          </div>
        ) : (() => {
          const svgWidth = 500;
          const svgHeight = 200;
          const paddingLeft = 45;
          const paddingRight = 20;
          const paddingTop = 20;
          const paddingBottom = 30;

          const chartWidth = svgWidth - paddingLeft - paddingRight;
          const chartHeight = svgHeight - paddingTop - paddingBottom;

          const points = data.dailyTrend.map((day, i) => {
            const total = day.present + day.absent;
            const rate = total ? (day.present / total) * 100 : 0;
            const x = paddingLeft + (data.dailyTrend.length > 1 ? (i / (data.dailyTrend.length - 1)) * chartWidth : chartWidth / 2);
            const y = paddingTop + chartHeight - (rate / 100) * chartHeight;
            
            // Format date label
            const [year, month, dayNum] = day.date.split('-').map(Number);
            const dateObj = new Date(year, month - 1, dayNum);
            const dateStr = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

            return { x, y, rate, dateStr, day };
          });

          // Construct Line Path (D attribute)
          let linePath = '';
          let areaPath = '';
          if (points.length > 0) {
            linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
            areaPath = `M ${points[0].x} ${svgHeight - paddingBottom} ` + points.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${points[points.length - 1].x} ${svgHeight - paddingBottom} Z`;
          }

          return (
            <div className="w-full overflow-x-auto">
              <div className="min-w-[500px]">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
                  <defs>
                    <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  {[0, 25, 50, 75, 100].map((tick) => {
                    const y = paddingTop + chartHeight - (tick / 100) * chartHeight;
                    return (
                      <g key={tick}>
                        <line 
                          x1={paddingLeft} 
                          y1={y} 
                          x2={svgWidth - paddingRight} 
                          y2={y} 
                          className="stroke-slate-200/60 dark-theme:stroke-slate-800/40" 
                          strokeWidth="1" 
                          strokeDasharray="4 4" 
                        />
                        <text 
                          x={paddingLeft - 8} 
                          y={y + 3} 
                          textAnchor="end" 
                          className="fill-slate-400 font-semibold text-[9px]"
                        >
                          {tick}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Gradient Area Fill */}
                  {areaPath && (
                    <path d={areaPath} fill="url(#chart-area-grad)" />
                  )}

                  {/* Trend Stroke Line */}
                  {linePath && (
                    <path 
                      d={linePath} 
                      fill="none" 
                      stroke="#3b82f6" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                  )}

                  {/* Data Node Dots */}
                  {points.map((p, idx) => (
                    <g key={idx} className="group/dot cursor-pointer">
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="4.5" 
                        className="fill-white stroke-blue-600 dark-theme:fill-slate-900" 
                        strokeWidth="2" 
                      />
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="9" 
                        className="fill-blue-500/10 opacity-0 group-hover/dot:opacity-100 transition-opacity" 
                      />
                      {/* Tooltip Box */}
                      <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none">
                        <rect 
                          x={p.x - 45} 
                          y={p.y - 32} 
                          width="90" 
                          height="24" 
                          rx="4" 
                          className="fill-slate-900 dark-theme:fill-slate-950 shadow" 
                        />
                        <text 
                          x={p.x} 
                          y={p.y - 22} 
                          textAnchor="middle" 
                          className="fill-white font-bold text-[8px]"
                        >
                          {p.dateStr}
                        </text>
                        <text 
                          x={p.x} 
                          y={p.y - 12} 
                          textAnchor="middle" 
                          className="fill-blue-400 font-semibold text-[7.5px]"
                        >
                          {Math.round(p.rate)}% Attendance
                        </text>
                      </g>
                    </g>
                  ))}

                  {/* X Axis Labels */}
                  {points.map((p, idx) => (
                    <text
                      key={idx}
                      x={p.x}
                      y={svgHeight - 10}
                      textAnchor="middle"
                      className="fill-slate-400 font-semibold text-[8px]"
                    >
                      {p.dateStr}
                    </text>
                  ))}
                </svg>
              </div>
            </div>
          );
        })()}
      </div>

    </div>
  );
}
