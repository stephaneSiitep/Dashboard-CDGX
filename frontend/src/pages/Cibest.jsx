import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import DataTable from '../components/DataTable/DataTable';
import DonutChart from '../components/DonutChart/DonutChart';
import BarChart from '../components/BarChart/BarChart';
import KPI from '../components/KPI/KPI';
import Header from '../components/Header/Header';
// Remove this line: import { useDashboard } from '../../context/DashboardContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCamera, 
  faCheckCircle, 
  faTimesCircle, 
  faChartPie, 
  faSignal,
  faNetworkWired,
  faClock,
  faVideo,
  faShieldAlt,
} from '@fortawesome/free-solid-svg-icons';
import TimelinePerformance from '../components/TimelinePerformance/TimelinePerformance';
import NetworkTopology from '../components/NetworkTopology/NetworkTopology';

const Cibest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Replace useDashboard with local state
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('cibestDarkMode') === 'true' || false
  );
  
  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('cibestDarkMode', darkMode);
  }, [darkMode]);

  const [equipements, setEquipements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [statusSummary, setStatusSummary] = useState({
    total_equipements: 0,
    online: 0,
    offline: 0,
    uptime_percentage: 0
  });

  // Function to fetch camera data
  const fetchEquipementData = async () => {
    try {
      setLoading(true);
      const response = await fetch('${API_URL}/api/cibest/equipements');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setEquipements(result.data);
        setLastUpdate(new Date(result.timestamp));
        setError(null);
      } else {
        throw new Error('Failed to fetch equipement data');
      }
    } catch (err) {
      console.error('Error fetching equipement data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch status summary
  const fetchStatusSummary = async () => {
    try {
      const response = await fetch('${API_URL}/api/cibest/equipements/status');
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setStatusSummary(result.summary);
        }
      }
    } catch (err) {
      console.error('Error fetching status summary:', err);
    }
  };

  useEffect(() => {
    // Initial fetch immediately (manual)
    fetchEquipementData(false);
    fetchStatusSummary();

    // Set interval to fetch every 10 seconds (auto-refresh)
    const intervalId = setInterval(() => {
      fetchEquipementData(true); // Auto-refresh mode
      fetchStatusSummary();
    }, 10000);

    // Cleanup on component unmount
    return () => clearInterval(intervalId);
  }, []); // Remove loading dependency to prevent interval restart

  // Prepare data for charts
  const getChartData = () => {
    const onlineCount = equipements.filter(eq => eq.reachable === 'true').length;
    const offlineCount = equipements.length - onlineCount;
    
    return {
      donutData: [onlineCount, offlineCount],
      donutLabels: ['Online', 'Offline'],
      donutColors: ['#10B981', '#EF4444'],
      
      // RTT distribution for bar chart
      rttData: equipements
        .filter(eq => eq.reachable === 'true' && eq.rtt_ms)
        .map(eq => eq.rtt_ms),
      rttLabels: equipements
        .filter(eq => eq.reachable === 'true' && eq.rtt_ms)
        .map(eq => eq.name)
    };
  };

  // Prepare data for DataTable
  const getTableData = () => {
    return equipements.map(eq => ({
      'Nom Equipement': eq.name,
      'IP Address': eq.ip,
      'Status': eq.reachable === 'true' ? '🟢 Online' : '🔴 Offline',
      'RTT (ms)': eq.rtt_ms || 'N/A',
      'TTL': eq.ttl || 'N/A',
      'Error': eq.error || 'None',
      'Last Check': new Date(eq.timestamp).toLocaleTimeString()
    }));
  };

  const tableColumns = [
    'Nom Equipement',
    'IP Address',
    'Status',
    'RTT (ms)',
    'TTL',
    'Error',
    'Last Check'
  ];

  const chartData = getChartData();

  if (loading && equipements.length === 0) {
    return (
      <div className={`flex justify-center items-center h-screen ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
            Chargement des équipements...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 transition-colors duration-300 ${
      darkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Header Component */}
      <div className="flex items-center justify-between">
        <Header
          title="CDGxpress Equipement Monitoring Dashboard"
          icon={faVideo}
          darkMode={darkMode}
          onDarkModeToggle={() => setDarkMode(!darkMode)}
        />
        {user?.role === 'admin' && (
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition ml-4 shrink-0"
          >
            <FontAwesomeIcon icon={faShieldAlt} />
            Panel Admin
          </button>
        )}
      </div>
      
      {/* Subtitle and Last Update */}
      <div className="mb-8">
        <p className={`text-lg mb-2 ${
          darkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          Monitoring en temps réel du réseau d'équipements
        </p>
        {lastUpdate && (
          <p className={`text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Last updated: {lastUpdate.toLocaleString()}
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className={`border px-4 py-3 rounded mb-6 ${
          darkMode 
            ? 'bg-red-900/20 border-red-700 text-red-300' 
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPI
          title="Total Equipements"
          value={statusSummary.total_equipements}
          icon={faCamera}
          darkMode={darkMode}
        />
        <KPI
          title="Online Equipements"
          value={statusSummary.online}
          icon={faCheckCircle}
          darkMode={darkMode}
        />
        <KPI
          title="Offline Equipements"
          value={statusSummary.offline}
          icon={faTimesCircle}
          darkMode={darkMode}
        />
        <KPI
          title="Uptime Percentage"
          value={`${statusSummary.uptime_percentage}%`}
          icon={faSignal}
          darkMode={darkMode}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status Distribution Donut Chart */}
        <DonutChart
          data={chartData.donutData}
          labels={chartData.donutLabels}
          colors={chartData.donutColors}
          darkMode={darkMode}
          title="Statut des Equipements"
          icon={faChartPie}
        />
        
        {/* RTT Performance Bar Chart */}
        <BarChart
          data={chartData.rttData.slice(0, 10)} // Show top 10 for readability
          labels={chartData.rttLabels.slice(0, 10)}
          darkMode={darkMode}
          title="Temps de réponse (RTT) - Top 10 Equipements"
          height={280}
        />
      </div>

      {/* New Components Row */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        {/* Timeline Performance Component */}
        <TimelinePerformance
          equipements={equipements}
          darkMode={darkMode}
          title="Equipment Performance Timeline"
        />
      </div>

      

      {/* Camera Details Table */}
      <DataTable
        data={getTableData()}
        columns={tableColumns}
        darkMode={darkMode}
        title="Détails Equipements"
        icon={faNetworkWired}
      />

      {/* Loading indicator for updates */}
      {loading && equipements.length > 0 && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg transition-colors duration-300 ${
          darkMode 
            ? 'bg-blue-700 text-blue-100' 
            : 'bg-blue-600 text-white'
        }`}>
          <FontAwesomeIcon icon={faClock} className="mr-2" />
          Updating data...
        </div>
      )}
    </div>
  );
};

export default Cibest;
