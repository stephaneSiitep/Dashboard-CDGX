import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faFilter, faClock } from '@fortawesome/free-solid-svg-icons';
import { API_URL } from '../../config';

const TimelinePerformance = ({ equipements, darkMode = false, title = "Equipment Performance Timeline" }) => {
  const [selectedEquipement, setSelectedEquipement] = useState('all');
  const [timeRange, setTimeRange] = useState('1h');
  const [performanceData, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (equipements.length === 0) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        if (selectedEquipement === 'all') {
          const res = await fetch(`${API_URL}/api/cibest/history/all?range=${timeRange}`);
          const json = await res.json();
          if (!json.success) return;

          setSeries([{
            name: 'RTT moyen (ms)',
            data: json.data.map(row => ({
              x: new Date(row.bucket).getTime(),
              y: row.avg_rtt !== null ? parseFloat(row.avg_rtt) : null,
            })),
          }]);
        } else {
          const eq = equipements.find(e => e.id.toString() === selectedEquipement);
          if (!eq) return;

          const res = await fetch(`${API_URL}/api/cibest/history?ip=${eq.ip}&range=${timeRange}`);
          const json = await res.json();
          if (!json.success) return;

          setSeries([{
            name: eq.name,
            data: json.data.map(row => ({
              x: new Date(row.timestamp).getTime(),
              y: row.reachable === 'true' && row.rtt_ms !== null ? parseFloat(row.rtt_ms) : null,
            })),
          }]);
        }
      } catch (err) {
        console.error('TimelinePerformance fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [selectedEquipement, timeRange, equipements]);

  const chartOptions = {
    chart: {
      type: 'line',
      toolbar: { show: true },
      background: 'transparent',
      zoom: { enabled: true },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    xaxis: {
      type: 'datetime',
      labels: {
        style: { colors: darkMode ? '#e5e7eb' : '#4b5563', fontWeight: 600 },
        datetimeFormatter: { year: 'yyyy', month: "MMM 'yy", day: 'dd MMM', hour: 'HH:mm' },
      },
    },
    yaxis: {
      title: { text: 'Response Time (ms)', style: { color: darkMode ? '#e5e7eb' : '#4b5563' } },
      labels: {
        style: { colors: darkMode ? '#e5e7eb' : '#4b5563', fontWeight: 600 },
        formatter: (v) => (v !== null && v !== undefined ? `${Math.round(v)}ms` : 'Offline'),
      },
      min: 0,
    },
    colors: darkMode ? ['#60a5fa'] : ['#3b82f6'],
    tooltip: {
      theme: darkMode ? 'dark' : 'light',
      x: { format: 'dd MMM yyyy HH:mm' },
      y: { formatter: (v) => (v !== null ? `${Math.round(v)}ms` : 'Offline') },
    },
    grid: { borderColor: darkMode ? '#374151' : '#e5e7eb', strokeDashArray: 3 },
    markers: { size: 3, strokeWidth: 2, fillOpacity: 0.8 },
    legend: { labels: { colors: darkMode ? '#e5e7eb' : '#4b5563' } },
    noData: { text: loading ? 'Chargement...' : 'Aucune donnee sur cette periode' },
  };

  const currentEq = selectedEquipement !== 'all'
    ? equipements.find(e => e.id.toString() === selectedEquipement)
    : null;

  const onlineCount = equipements.filter(e => e.reachable === 'true').length;

  return (
    <div className={`p-6 rounded-xl shadow-lg border transition-all duration-300
      ${darkMode ? 'bg-gray-800 border-gray-700 text-slate-200' : 'bg-white border-gray-200 text-gray-900'}
      hover:shadow-xl`}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faChartLine} className="text-blue-500" />
          <h2 className="text-xl font-bold">{title}</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faFilter} className="text-gray-500" />
            <select
              value={selectedEquipement}
              onChange={(e) => setSelectedEquipement(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
                focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            >
              <option value="all">Tous les Equipements (Moyenne)</option>
              {equipements.map(eq => (
                <option key={eq.id} value={eq.id.toString()}>
                  {eq.name} ({eq.ip})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faClock} className="text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}
                focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
            </select>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ReactApexChart
          options={chartOptions}
          series={performanceData}
          type="line"
          height="100%"
        />
      </div>

      <div className={`mt-4 p-4 rounded-lg border-l-4 border-blue-500
        ${darkMode ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="font-medium">Equipment :</span>
            <span className="ml-2">
              {currentEq ? `${currentEq.name} (${currentEq.ip})` : `Tous (${equipements.length})`}
            </span>
          </div>
          <div>
            <span className="font-medium">Periode :</span>
            <span className="ml-2">
              {timeRange === '1h' ? 'Derniere heure' : timeRange === '6h' ? '6 dernieres heures' : '24 dernieres heures'}
            </span>
          </div>
          <div>
            <span className="font-medium">Statut actuel :</span>
            <span className={`ml-2 font-medium ${
              currentEq
                ? currentEq.reachable === 'true' ? 'text-green-500' : 'text-red-500'
                : onlineCount > equipements.length / 2 ? 'text-green-500' : 'text-red-500'
            }`}>
              {currentEq
                ? (currentEq.reachable === 'true' ? 'En ligne' : 'Hors ligne')
                : `${onlineCount}/${equipements.length} en ligne`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelinePerformance;
