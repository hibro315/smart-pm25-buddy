import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useExposureHistory } from '@/hooks/useExposureHistory';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calendar, TrendingUp, MapPin, RefreshCw, Loader2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const ExposureHistoryDashboard = () => {
  const { t, language } = useLanguage();
  const { exposureLogs, summary, loading, loadExposureLogs, syncToBackend } = useExposureHistory();
  const [syncing, setSyncing] = useState(false);

  // Get locale string based on language
  const getLocale = () => {
    switch (language) {
      case 'en': return 'en-US';
      case 'zh': return 'zh-CN';
      default: return 'th-TH';
    }
  };

  useEffect(() => {
    loadExposureLogs();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await syncToBackend();
    await loadExposureLogs();
    setSyncing(false);
  };

  const formatTime = (value: string | number) => {
    return new Date(value).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (value: string | number) => {
    return new Date(value).toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' });
  };

  const formatFullDate = (value: string | number) => {
    return new Date(value).toLocaleDateString(getLocale());
  };

  const formatDateTime = (value: string | number) => {
    return new Date(value).toLocaleString(getLocale());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">{t('exposure.title')}</h3>
          </div>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {t('exposure.sync')}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">{t('exposure.total.logs')}</p>
            <p className="text-2xl font-bold">{exposureLogs.length}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">{t('exposure.avg.pm25')}</p>
            <p className="text-2xl font-bold">
              {exposureLogs.length > 0
                ? Math.round(exposureLogs.reduce((sum, log) => sum + log.pm25, 0) / exposureLogs.length)
                : 0}
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">{t('exposure.avg.phri')}</p>
            <p className="text-2xl font-bold">
              {exposureLogs.length > 0
                ? (exposureLogs.reduce((sum, log) => sum + log.phri, 0) / exposureLogs.length).toFixed(1)
                : 0}
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">{t('exposure.pending.sync')}</p>
            <p className="text-2xl font-bold text-warning">
              {exposureLogs.filter(log => !log.synced).length}
            </p>
          </div>
        </div>

        {summary && (
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="hourly">
                <Calendar className="w-4 h-4 mr-1" />
                {t('exposure.hourly')}
              </TabsTrigger>
              <TabsTrigger value="daily">
                <Calendar className="w-4 h-4 mr-1" />
                {t('exposure.daily')}
              </TabsTrigger>
              <TabsTrigger value="weekly">
                <Calendar className="w-4 h-4 mr-1" />
                {t('exposure.weekly')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hourly" className="mt-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.hourly.slice(0, 24)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatTime}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={formatDateTime}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="pm25" stroke="hsl(var(--destructive))" name="PM2.5" />
                    <Line type="monotone" dataKey="phri" stroke="hsl(var(--primary))" name="PHRI" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="daily" className="mt-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.daily.slice(0, 14)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={formatFullDate}
                    />
                    <Legend />
                    <Bar dataKey="avgPM25" fill="hsl(var(--destructive))" name={t('chart.avg.pm25')} />
                    <Bar dataKey="avgPHRI" fill="hsl(var(--primary))" name={t('chart.avg.phri')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">{t('exposure.locations.visited')}</p>
                <div className="flex flex-wrap gap-2">
                  {summary.daily
                    .slice(0, 14)
                    .flatMap(d => d.locationsVisited)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map((location, i) => (
                      <div key={i} className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
                        <MapPin className="w-3 h-3" />
                        {location}
                      </div>
                    ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="weekly" className="mt-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.weekly.slice(0, 12)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="week"
                      tickFormatter={formatDate}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => `${t('exposure.week.starting')}: ${formatFullDate(value)}`}
                    />
                    <Legend />
                    <Bar dataKey="avgPM25" fill="hsl(var(--destructive))" name={t('chart.avg.pm25')} />
                    <Bar dataKey="highRiskDays" fill="hsl(var(--warning))" name={t('exposure.high.risk.days')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4">
                {summary.weekly.slice(0, 3).map((week, i) => (
                  <div key={i} className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">
                      {formatDate(week.week)}
                    </p>
                    <p className="text-sm font-semibold">PM2.5: {week.avgPM25}</p>
                    <p className="text-sm font-semibold">PHRI: {week.avgPHRI}</p>
                    <p className="text-xs text-destructive mt-1">
                      {week.highRiskDays} {t('exposure.high.risk.days')}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {exposureLogs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('exposure.no.data')}</p>
            <p className="text-sm mt-1">{t('exposure.no.data.desc')}</p>
          </div>
        )}
      </Card>
    </div>
  );
};
