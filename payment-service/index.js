require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const amqplib = require('amqplib');

const PORT = process.env.PORT || 3001;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const REQUEST_QUEUE = process.env.REQUEST_QUEUE || 'transaction_requests';
const CONFIRM_QUEUE = process.env.CONFIRM_QUEUE || 'transaction_confirmations';
const AUTO_CONFIRM_MS = parseInt(process.env.AUTO_CONFIRM_MS || '0', 10);

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

pool.connect()
  .then(() => console.log('✅ Conectado ao Postgres!'))
  .catch(err => console.error('❌ Erro ao conectar no Postgres:', err));
let amqpConn, channel;

async function setupAmqp() {
  amqpConn = await amqplib.connect(RABBITMQ_URL);
  channel = await amqpConn.createChannel();
  await channel.assertQueue(REQUEST_QUEUE, { durable: true });
  await channel.assertQueue(CONFIRM_QUEUE, { durable: true });
  console.log('Payment service connected to RabbitMQ');
}

async function publish(queue, message) {
  const payload = Buffer.from(JSON.stringify(message));
  channel.sendToQueue(queue, payload, { persistent: true });
}

async function createTransaction(user_email, amount) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `INSERT INTO transactions (user_email, amount, status) VALUES ($1, $2, $3) RETURNING *`,
      [user_email, amount, 'PENDING']
    );
    return res.rows[0];
  } finally {
    client.release();
  }
}

async function updateTransactionStatus(id, status) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE transactions SET status=$1, updated_at=now() WHERE id=$2 RETURNING *`,
      [status, id]
    );
    return res.rows[0];
  } finally {
    client.release();
  }
}

async function getTransaction(id) {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT * FROM transactions WHERE id=$1`, [id]);
    return res.rows[0];
  } finally {
    client.release();
  }
}

const app = express();
app.use(bodyParser.json());

app.post('/transactions', async (req, res) => {
  try {
    const { user_email, amount } = req.body;
    if (!user_email || !amount) return res.status(400).json({ error: 'user_email and amount required' });

    const tx = await createTransaction(user_email, amount);
    await publish(REQUEST_QUEUE, {
      type: 'TRANSACTION_REQUEST',
      transaction: { id: tx.id, user_email: tx.user_email, amount: tx.amount, status: tx.status },
      timestamp: new Date().toISOString()
    });

    if (AUTO_CONFIRM_MS > 0) {
      setTimeout(async () => {
        try {
          const confirmed = await updateTransactionStatus(tx.id, 'SUCCESS');
          await publish(CONFIRM_QUEUE, {
            type: 'TRANSACTION_CONFIRMED',
            transaction: { id: confirmed.id, user_email: confirmed.user_email, amount: confirmed.amount, status: confirmed.status },
            timestamp: new Date().toISOString()
          });
          console.log(`Auto-confirmed tx ${tx.id}`);
        } catch (err) {
          console.error('Erro ao auto-confirmar:', err);
        }
      }, AUTO_CONFIRM_MS);
    }

    res.status(201).json({ transaction: tx });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.post('/transactions/:id/confirm', async (req, res) => {
  const { id } = req.params;
  try {
    const tx = await getTransaction(id);
    if (!tx) return res.status(404).json({ error: 'transaction not found' });
    if (tx.status === 'SUCCESS') return res.status(400).json({ error: 'already confirmed' });

    const confirmed = await updateTransactionStatus(id, 'SUCCESS');
    await publish(CONFIRM_QUEUE, {
      type: 'TRANSACTION_CONFIRMED',
      transaction: { id: confirmed.id, user_email: confirmed.user_email, amount: confirmed.amount, status: confirmed.status },
      timestamp: new Date().toISOString()
    });

    res.json({ transaction: confirmed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.get('/transactions/:id', async (req, res) => {
  try {
    const tx = await getTransaction(req.params.id);
    if (!tx) return res.status(404).json({ error: 'not found' });
    res.json({ transaction: tx });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

async function start() {
  await setupAmqp();
  app.listen(PORT, () => {
    console.log(`Payment service listening on ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start payment service', err);
  process.exit(1);
});
