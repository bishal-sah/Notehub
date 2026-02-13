/**
 * Reusable Recharts-based analytics chart components.
 */
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function ChartCard({ title, children, className = '' }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

/* ─── Upload Trend Area Chart ──────────────────────────── */

interface UploadTrendProps {
  data: { date: string; count: number }[];
  title?: string;
}

export function UploadTrendChart({ data, title = 'Upload Trends' }: UploadTrendProps) {
  const formatted = data.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <ChartCard title={title}>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#uploadGrad)" name="Uploads" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ─── Downloads Per Faculty Bar Chart ──────────────────── */

interface BarChartProps {
  data: { name: string; [key: string]: any }[];
  dataKey: string;
  title?: string;
  color?: string;
  nameKey?: string;
}

export function FacultyBarChart({ data, dataKey, title = 'Downloads per Faculty', color = '#3b82f6', nameKey = 'name' }: BarChartProps) {
  return (
    <ChartCard title={title}>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis dataKey={nameKey} type="category" tick={{ fontSize: 11 }} width={100} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
            />
            <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ─── Vertical Bar Chart ───────────────────────────────── */

export function VerticalBarChart({ data, dataKey, title = 'Chart', color = '#6366f1', nameKey = 'name' }: BarChartProps) {
  return (
    <ChartCard title={title}>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
            />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ─── Top Subjects Pie Chart ──────────────────────────── */

interface PieChartProps {
  data: { name: string; value?: number; count?: number; note_count?: number }[];
  title?: string;
}

export function SubjectPieChart({ data, title = 'Top Subjects' }: PieChartProps) {
  const normalized = data.map(d => ({
    name: d.name,
    value: d.value ?? d.count ?? d.note_count ?? 0,
  }));

  return (
    <ChartCard title={title}>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={normalized}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={false}
              style={{ fontSize: 11 }}
            >
              {normalized.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ─── User Growth Line Graph ──────────────────────────── */

interface GrowthLineProps {
  data: { date: string; count: number }[];
  title?: string;
}

export function UserGrowthChart({ data, title = 'User Registrations' }: GrowthLineProps) {
  const formatted = data.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <ChartCard title={title}>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="New Users" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ─── Multi-Line Trend Chart ──────────────────────────── */

interface MultiLineProps {
  data: { [key: string]: any }[];
  lines: { key: string; color: string; name: string }[];
  xKey: string;
  title?: string;
}

export function MultiLineChart({ data, lines, xKey, title = 'Trends' }: MultiLineProps) {
  return (
    <ChartCard title={title}>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            {lines.map(l => (
              <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={2} dot={{ r: 3 }} name={l.name} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ─── Status Distribution Donut ────────────────────────── */

interface StatusDonutProps {
  data: { name: string; value: number }[];
  title?: string;
}

const STATUS_COLORS: Record<string, string> = {
  Approved: '#10b981',
  Pending: '#f59e0b',
  Rejected: '#ef4444',
};

export function StatusDonutChart({ data, title = 'Note Status Distribution' }: StatusDonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ChartCard title={title}>
      <div className="h-[280px] flex items-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6366f1'} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
              formatter={(value: number) => [`${value} (${total ? ((value / total) * 100).toFixed(0) : 0}%)`, '']}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
