export const loginHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Login</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; }
    input { width: 100%; padding: 8px; box-sizing: border-box; }
    button { padding: 10px 15px; background: #0070f3; color: white; border: none; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Login</h1>
  <form id="loginForm">
    <div class="form-group">
      <label for="username">Usuário:</label>
      <input type="text" id="username" name="username" required>
    </div>
    <div class="form-group">
      <label for="password">Senha:</label>
      <input type="password" id="password" name="password" required>
    </div>
    <button type="submit">Entrar</button>
  </form>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      if (response.ok) {
        const { token } = await response.json();
        localStorage.setItem('authToken', token);
        window.location.href = '/dashboard';
      } else {
        alert('Credenciais inválidas');
      }
    });
  </script>
</body>
</html>
`; 