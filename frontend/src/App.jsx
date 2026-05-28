import { useEffect } from 'react';
import { API_URL } from './config';

function App() {
  useEffect(() => {
    // Function to fetch data
    const fetchData = () => {
      fetch(`${API_URL}/data`)
        .then((res) => res.json())
        .then((data) => {
          console.log('Fetched data from backend:', data);
        })
        .catch((err) => {
          console.error('Error fetching data:', err);
        });
    };

    // Initial fetch immediately
    fetchData();

    // Set interval to fetch every 130,000 ms (130 seconds)
    const intervalId = setInterval(fetchData, 130000);

    // Cleanup on component unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', fontSize: '24px', padding: '2rem' }}>
      Hi Dashboard
    </div>
  );
}

export default App;
