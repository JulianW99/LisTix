import { useEffect, useState } from 'react'

function App() {
  const [data, setData] = useState<{ message: string; dbTime: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ruft den Express-Endpunkt auf
    fetch('/api/message')
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fehler beim Laden:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Mein MVP Setup</h1>
      {loading ? (
        <p>Lade Daten vom Server...</p>
      ) : data ? (
        <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '8px', display: 'inline-block' }}>
          <p><strong>Server-Nachricht:</strong> {data.message}</p>
          <p><strong>Neon DB Zeit:</strong> {data.dbTime}</p>
        </div>
      ) : (
        <p style={{ color: 'red' }}>Verbindung zum Backend fehlgeschlagen.</p>
      )}
    </div>
  )
}

export default App