'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Calendar } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useGroups } from '@/hooks/useGroups';
import { getDateRange, formatDate, formatNumber } from '@/lib/utils';

type ExportFormat = 'csv' | 'excel';

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(getDateRange(7).from);
  const [dateTo, setDateTo] = useState(getDateRange(7).to);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');

  const { groups, isLoading } = useGroups();

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setExportFormat(format);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: format,
          dateRange: { from: dateFrom, to: dateTo },
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whatsapp-stats-${dateFrom}-to-${dateTo}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const quickRanges = [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 14 Days', days: 14 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 90 Days', days: 90 },
  ];

  return (
    <div className="flex flex-col">
      <Header
        title="Reports"
        subtitle="Generate and download analytics reports"
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Groups Tracked</p>
                <p className="text-xl font-bold">
                  {isLoading ? '-' : formatNumber(groups.length)}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Date Range</p>
                <p className="text-sm font-medium">
                  {formatDate(dateFrom)} - {formatDate(dateTo)}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <Download className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Export Formats</p>
                <div className="flex gap-1">
                  <Badge variant="info">CSV</Badge>
                  <Badge variant="info">Excel</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Report Generator */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Quick Date Ranges */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Quick Select
                </label>
                <div className="flex flex-wrap gap-2">
                  {quickRanges.map(({ label, days }) => {
                    const range = getDateRange(days);
                    const isSelected = dateFrom === range.from && dateTo === range.to;
                    return (
                      <Button
                        key={days}
                        variant={isSelected ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setDateFrom(range.from);
                          setDateTo(range.to);
                        }}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Date Range */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Export Buttons */}
              <div className="flex flex-wrap gap-3 border-t pt-6">
                <Button
                  onClick={() => handleExport('csv')}
                  disabled={isExporting}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {isExporting && exportFormat === 'csv' ? 'Exporting...' : 'Export CSV'}
                </Button>

                <Button
                  onClick={() => handleExport('excel')}
                  disabled={isExporting}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {isExporting && exportFormat === 'excel' ? 'Exporting...' : 'Export Excel'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Info */}
        <Card>
          <CardHeader>
            <CardTitle>Export Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-gray-600">
              <p>
                <strong>CSV Export:</strong> Comma-separated values file, compatible with
                any spreadsheet application.
              </p>
              <p>
                <strong>Excel Export:</strong> Native Excel format (.xlsx) with formatted
                columns and headers.
              </p>
              <p className="text-gray-500">
                Reports include: Date, Group ID, Group Name, Total Members, Joined,
                Left, Net Growth, and Notes for each group on each day within the
                selected date range.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
