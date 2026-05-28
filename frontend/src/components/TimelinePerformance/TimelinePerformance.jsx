import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faFilter, faClock } from '@fortawesome/free-solid-svg-icons';

const TimelinePerformance = ({ equipements, darkMode = false, title = "Equipment Performance Timeline" }) => {
  const [selectedEquipement, setSelectedEquipement] = useState('all');
  const [performanceData, setPerformanceData] = useState([]);
  const [timeRange, setTimeRange] = useState('1h'); // 1h, 6h, 24h

  // Generate mock historical data for demonstration
  const generateHistoricalData = (camera, hours = 1) => {
    const data = [];
    const now = new Date();
    const points = hours * 12; // 12 points per hour (every 5 minutes)
    
    for (let i = points; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 5 * 60 * 1000));
      const baseRtt = camera.rtt_ms || 30;
      const variation = Math.random() * 20 - 10; // ±10ms variation
      const rtt = Math.max(1, baseRtt + variation);
      const isOnline = camera.reachable === 'true' ? (Math.random() > 0.05) : (Math.random() > 0.8);
      
      data.push({
        x: timestamp.getTime(),
        y: isOnline ? rtt : null,
        status: isOnline ? 'online' : 'offline'
      });
    }
    return data;
  };

  useEffect(() => {
    if (equipements.length === 0) return;

    const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24;

    if (selectedEquipement === 'all') {
      // Show average performance of all equipements
      const allData = generateHistoricalData(equipements[0], hours);
      const avgData = allData.map(point => {
        const onlineEquipements = equipements.filter(eq => eq.reachable === 'true');
        const avgRtt = onlineEquipements.length > 0
          ? onlineEquipements.reduce((sum, eq) => sum + (eq.rtt_ms || 30), 0) / onlineEquipements.length
          : null;
        
        return {
          x: point.x,
          y: avgRtt ? avgRtt + (Math.random() * 10 - 5) : null,
          status: avgRtt ? 'online' : 'offline'
        };
      });
      setPerformanceData([{ name: 'Average RTT', data: avgData }]);
    } else {
      const equipement = equipements.find(eq => eq.id.toString() === selectedEquipement);
      if (equipement) {
        const data = generateHistoricalData(equipement, hours);
        setPerformanceData([{ name: equipement.name, data }]);
      }
    }
  }, [selectedEquipement, equipements, timeRange]);

  const chartOptions = {
    chart: {
      type: 'line',
      toolbar: { show: true },
      background: 'transparent',
      zoom: { enabled: true }
    },
    dataLabels: { enabled: false },
    stroke: { 
      curve: 'smooth', 
      width: 3,
      dashArray: [0] // Solid line for online, dashed for issues
    },
    xaxis: {
      type: 'datetime',
      labels: { 
        style: { colors: darkMode ? '#e5e7eb' : '#4b5563', fontWeight: 600 },
        datetimeFormatter: {
          year: 'yyyy',
          month: 'MMM \'yy',
          day: 'dd MMM',
          hour: 'HH:mm'
        }
      }
    },
    yaxis: {
      title: { text: 'Response Time (ms)', style: { color: darkMode ? '#e5e7eb' : '#4b5563' } },
      labels: { 
        style: { colors: darkMode ? '#e5e7eb' : '#4b5563', fontWeight: 600 },
        formatter: (value) => value ? `${Math.round(value)}ms` : 'Offline'
      },
      min: 0
    },
    colors: darkMode ? ['#60a5fa', '#34d399', '#fbbf24'] : ['#3b82f6', '#10b981', '#f59e0b'],
    tooltip: {
      theme: darkMode ? 'dark' : 'light',
      x: { format: 'dd MMM yyyy HH:mm' },
      y: { 
        formatter: (val) => val ? `${Math.round(val)}ms` : 'Offline'
      }
    },
    grid: { 
      borderColor: darkMode ? '#374151' : '#e5e7eb',
      strokeDashArray: 3
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      fillOpacity: 0.8
    },
    legend: {
      labels: { colors: darkMode ? '#e5e7eb' : '#4b5563' }
    }
  };

  return (
    <div className={`p-6 rounded-xl shadow-lg border transition-all duration-300
      ${darkMode
        ? 'bg-gray-800 border-gray-700 text-slate-200'
        : 'bg-white border-gray-200 text-gray-900'}
      hover:shadow-xl`}
    >
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faChartLine} className="text-blue-500" />
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Equipment Filter */}
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faFilter} className="text-gray-500" />
            <select
              value={selectedEquipement}
              onChange={(e) => setSelectedEquipement(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                ${darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'}
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
          
          {/* Time Range Filter */}
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faClock} className="text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                ${darkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'}
                focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
            </select>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="h-80">
        <ReactApexChart
          options={chartOptions}
          series={performanceData}
          type="line"
          height="100%"
        />
      </div>

      {/* Performance Summary */}
      <div className={`mt-4 p-4 rounded-lg border-l-4 border-blue-500
        ${darkMode ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="font-medium">Equipment:</span>
            <span className="ml-2">
              {selectedEquipement === 'all'
                ? `Tous les Equipements (${equipements.length} total)`
                : equipements.find(eq => eq.id.toString() === selectedEquipement)?.name || 'Unknown'
              }
            </span>
          </div>
          <div>
            <span className="font-medium">Time Range:</span>
            <span className="ml-2">
              {timeRange === '1h' ? 'Last Hour' : timeRange === '6h' ? 'Last 6 Hours' : 'Last 24 Hours'}
            </span>
          </div>
          <div>
            <span className="font-medium">Current Status:</span>
            <span className={`ml-2 font-medium ${
              selectedEquipement === 'all'
                ? equipements.filter(eq => eq.reachable === 'true').length > equipements.length / 2
                  ? 'text-green-500' : 'text-red-500'
                : equipements.find(eq => eq.id.toString() === selectedEquipement)?.reachable === 'true'
                  ? 'text-green-500' : 'text-red-500'
            }`}>
              {selectedEquipement === 'all'
                ? `${equipements.filter(eq => eq.reachable === 'true').length}/${equipements.length} Online`
                : equipements.find(eq => eq.id.toString() === selectedEquipement)?.reachable === 'true'
                  ? 'Online' : 'Offline'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelinePerformance;