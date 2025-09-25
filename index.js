const express = require('express');
const { Client } = require('pg');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

const db = new Client({
  host: 'localhost',
  port: 5432,
  user: 'pguser',      
  password: 'pgpass',   
  database: 'paymentsdb' 
});

db.connect()
  .then(() => console.log('✅ Conectado ao Postgres!'))
  .catch(err => console.error('❌ Erro ao conectar no Postgres:', err));

let channel;
async function connectRabbit() {
  try {
    const connection = await amqp.connect('amqp://localhost');
    channel = await connection.createChannel();
    await channel.assertQueue('notificacoes');
    console.log('✅ Conectado ao RabbitMQ!');
  } catch (err) {
    console.error('❌ Erro ao conectar no RabbitMQ:', err);
  }
}
connectRabbit();

app.post('/pagamento', async (req, res) => {
  const { usuario, valor } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO transacoes(usuario, valor, status) VALUES($1, $2, $3) RETURNING *',
      [usuario, valor, 'pendente']
    );
    const transacao = result.rows[0];

    channel.sendToQueue('notificacoes', Buffer.from(JSON.stringify({
      tipo: 'solicitacao',
      usuario,
      valor,
      status: 'pendente'
    })));

    res.status(201).json({ mensagem: 'Pagamento recebido!', transacao });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao processar pagamento' });
  }
});

app.listen(3000, () => {
  console.log('🚀 Servidor de Pagamentos rodando na porta 3000');
});
