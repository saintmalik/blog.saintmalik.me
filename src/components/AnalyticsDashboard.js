import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Globe, Users, Activity, TrendingUp, MapPin } from 'lucide-react';
import TrafficMap from './TrafficMap';

// Your deployed Cloudflare Worker URL - update this after deploying!
const ANALYTICS_WORKER_URL = 'https://blog-analytics-proxy.saintmalik.workers.dev';

const AnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');

  const getDateRange = (range) => {
    const now = new Date();
    const end = now.toISOString();
    let start = new Date();

    switch(range) {
      case '24h':
        start.setHours(now.getHours() - 24);
        break;
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      default:
        start.setDate(now.getDate() - 7);
    }

    return { start: start.toISOString(), end };
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    const { start, end } = getDateRange(timeRange);
    const { start: start24h } = getDateRange('24h');

    // Zone ID is now stored securely in the Cloudflare Worker
    const query = `
      query($zoneTag: string!) {
        viewer {
          zones(filter: {zoneTag: $zoneTag}) {
            httpRequests1dGroups(
              filter: {
                date_geq: "${start.split('T')[0]}"
                date_leq: "${end.split('T')[0]}"
              }
              limit: 1000
            ) {
              sum {
                pageViews
              }
              dimensions {
                date
              }
            }
            httpRequestsAdaptiveGroups(
              filter: {
                datetime_geq: "${start24h}"
                datetime_leq: "${end}"
              }
              limit: 100
            ) {
              count
              sum {
                edgeResponseBytes
              }
              dimensions {
                clientCountryName
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(ANALYTICS_WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      if (result.data && result.data.viewer && result.data.viewer.zones && result.data.viewer.zones.length > 0) {
        const zoneData = result.data.viewer.zones[0];

        const timeSeriesData = zoneData.httpRequests1dGroups.map(group => ({
          date: group.dimensions.date,
          pageViews: group.sum.pageViews,
        }));

        const regionNames = new Intl.DisplayNames(['en'], {type: 'region'});

        const countryData = zoneData.httpRequestsAdaptiveGroups
          .filter(group => group.dimensions.clientCountryName)
          .map(group => {
            const code = group.dimensions.clientCountryName;
            let name = code;
            try {
              if (code.length === 2) {
                name = regionNames.of(code) || code;
              }
            } catch (e) {
              console.warn(`Could not map country code: ${code}`);
            }
            return {
              country: name,
              requests: group.count,
            };
          })
          .sort((a, b) => b.requests - a.requests);

        const totalPageViews = timeSeriesData.reduce((sum, day) => sum + day.pageViews, 0);

        setAnalyticsData({
          timeSeries: timeSeriesData,
          countries: countryData,
          totals: {
            pageViews: totalPageViews,
          }
        });
      } else {
        throw new Error('No data returned. The worker may not be configured correctly.');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  if (loading && !analyticsData) {
    return (
      <div className="min-h-screen bg-[#000508] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/60 text-lg">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000508] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
              <Globe className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Traffic Insights</h1>
              <p className="text-white/40 text-sm">Real-time performance metrics</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
          </div>
        </header>

        {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="bg-red-500/20 p-2 rounded-lg">
                    <Activity className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1">
                    <p className="text-red-400 text-sm font-medium">
                        {error.includes('unknown field') ? 'API Schema Error: Please contact support or check back later.' : error}
                    </p>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Page Views', value: analyticsData?.totals.pageViews.toLocaleString(), icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          ].map((stat, i) => (
            <div key={i} className="group bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/5 hover:border-white/10 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/40 text-sm font-medium mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-white tabular-nums">{stat.value || '0'}</p>
                </div>
                <div className={`${stat.bg} p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/5">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-white">Global Traffic Distribution</h2>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-white/40 text-xs font-medium uppercase tracking-wider">Live Map</span>
                </div>
              </div>
              <div className="h-[400px] w-full" style={{ minHeight: '400px', width: '100%' }}>
                <TrafficMap data={analyticsData?.countries || []} />
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/5">
              <h2 className="text-xl font-bold text-white mb-8">Traffic Analysis</h2>
              <div className="h-[350px] w-full" style={{ minHeight: '350px', width: '100%' }}>
                <ResponsiveContainer width="99%" height="100%">
                  <LineChart data={analyticsData?.timeSeries || []}>
                    <defs>
                      <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#ffffff20"
                      fontSize={12}
                      tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#ffffff20" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                    <Legend iconType="circle" />
                    <Line
                      type="monotone"
                      dataKey="pageViews"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      name="Page Views"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/5 h-full">
                <h2 className="text-xl font-bold text-white mb-6">Top Regions</h2>
                <div className="space-y-4">
                  {(analyticsData?.countries || []).slice(0, 8).map((country, index) => (
                    <div key={index} className="group flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl transition-all border border-transparent hover:border-white/5">
                      <div className="flex flex-col">
                        <span className="text-white font-semibold text-sm">{country.country}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-bold text-sm block">{country.requests.toLocaleString()}</span>
                        <span className="text-white/20 text-[10px] uppercase font-bold">Page Views</span>
                      </div>
                    </div>
                  ))}
                </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};

export default AnalyticsDashboard;
