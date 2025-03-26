import { exec } from 'node:child_process';

const createUser = async (username, password) => {
  const command = `pnpx wrangler d1 execute fingerprint_db --remote --command "INSERT INTO users (username, password) VALUES ('${username}', '${password}');"`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(`Usuário ${username} criado com sucesso!`);
    console.log(stdout);
  });
};

// Crie um usuário admin com senha 'senha123'
createUser('admin', 'senha123');