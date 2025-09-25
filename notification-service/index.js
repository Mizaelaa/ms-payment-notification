require('dotenv').config();
const amqplib = require('amqplib');
const express = require('express');

const PORT = process.env.PORT || 3002;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const REQUEST_QUEUE = process.env.REQUEST_QUEUE || 'transaction_requests';
const CONFIRM_QUEUE = process.env.CONFIRM_QUEUE || 'transaction_confirmations';

let channel;

async function setup() {
  const conn = await amqplib.connect(RABBITMQ_URL);
  channel = await conn.createChannel();
  await channel.assertQueue(REQUEST_QUEUE, { durable: true });
  await channel.assertQueue(CONFIRM_QUEUE, { durable: true });
  console.log('Notification service connected to RabbitMQ');

  channel.consume(REQUEST_QUEUE, msg => {
    if (msg !== null) {
      try {
        const payload = JSON.parse(msg.content.toString());
        console.log('[NOTIFY] Recebido request:', payload);
        console.log(`[NOTIFY] Enviando notificação ao usuário ${payload.transaction.user_email}: "Recebemos sua solicitação de pagamento (id ${payload.transaction.id})"`);
        channel.ack(msg);
      } catch (err) {
        console.error('Erro ao processar mensagem de request:', err);
        channel.nack(msg, false, false); 
      }
    }
  });

  channel.consume(CONFIRM_QUEUE, msg => {
    if (msg !== null) {
      try {
        const payload = JSON.parse(msg.content.toString());
        console.log('[NOTIFY] Recebido confirmation:', payload);
        console.log(`[NOTIFY] Enviando notificação ao usuário ${payload.transaction.user_email}: "Pagamento confirmado para transação ${payload.transaction.id}"`);
        channel.ack(msg);
      } catch (err) {
        console.error('Erro ao processar mensagem de confirmation:', err);
        channel.nack(msg, false, false);
      }
    }
  });
}

const app = express();
app.get('/', (req, res) => res.send('Notification service running'));
app.listen(PORT, () => console.log(`Notification service listening on ${PORT}`));

setup().catch(err => {
  console.error('Failed to start notification service', err);
  process.exit(1);
});
