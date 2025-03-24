export const fingerprintCollectorHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Fingerprint Collector</title>
  <script src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.min.js"></script>
  <script>
    const fpPromise = FingerprintJS.load();
    
    window.addEventListener('load', async () => {
      const fp = await fpPromise;
      const result = await fp.get();
      
      fetch('/api/fingerprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fingerprint: result.visitorId,
          components: result.components
        }),
      });
    });
  </script>
</head>
<body>
  <h1>Seu fingerprint está sendo coletado...</h1>
</body>
</html>
`; 