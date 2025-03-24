export const dashboardHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>Dashboard de Fingerprints</h1>
  <div id="fingerprints">Carregando...</div>
  
  <script>
    async function loadFingerprints() {
      const token = localStorage.getItem('authToken');
      if (!token) {
        window.location.href = '/login';
        return;
      }
      
      const response = await fetch('/api/fingerprints', {
        headers: {
          'Authorization': \`Bearer \${token}\`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const table = document.createElement('table');
        table.innerHTML = \`
          <thead>
            <tr>
              <th>ID</th>
              <th>Fingerprint</th>
              <th>User Agent</th>
              <th>IP</th>
              <th>Data/Hora</th>
            </tr>
          </thead>
          <tbody>
            \${data.fingerprints.map(fp => \`
              <tr>
                <td>\${fp.id}</td>
                <td>\${fp.fingerprint}</td>
                <td>\${fp.userAgent}</td>
                <td>\${fp.ip}</td>
                <td>\${new Date(fp.timestamp).toLocaleString()}</td>
              </tr>
            \`).join('')}
          </tbody>
        \`;
        document.getElementById('fingerprints').innerHTML = '';
        document.getElementById('fingerprints').appendChild(table);
      } else if (response.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    }
    
    loadFingerprints();
  </script>
</body>
</html>
`; 