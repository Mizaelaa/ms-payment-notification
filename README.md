# 🛒 Microsserviços de Pagamento e Notificação

Este projeto implementa dois microsserviços independentes (**Pagamento** e **Notificação**) para um sistema de e-commerce, utilizando **Node.js**, **PostgreSQL**, **RabbitMQ** e **Docker Compose**.



### 1. Clonar o repositório
```bash
git clone https://github.com/Mizaelaa/ms-payment-notification.git
cd <nome-do-repositorio>

Subir containers do banco e mensageria
docker-compose up -d


Postgres: localhost:5432

RabbitMQ: localhost:5672

Painel do RabbitMQ: http://localhost:15672

Usuário: guest | Senha: guest

3. Rodar o serviço de pagamento
cd ms-payment-service
npm install
npm start


O serviço sobe em: http://localhost:3000

4. Rodar o serviço de notificação
cd ms-notification-service
npm install
npm start


O serviço sobe em: http://localhost:3001

💳 Fluxo de pagamento

Cliente envia requisição POST /payments para o serviço de pagamento.

Serviço de pagamento armazena transação no banco com status pendente.

Serviço de pagamento publica mensagem no RabbitMQ.

Serviço de notificação consome a mensagem e notifica o usuário (console).

Após alguns segundos, pagamento é confirmado → status atualizado para sucesso.

Serviço de pagamento envia nova mensagem.

Serviço de notificação recebe e envia notificação de confirmação.

🔎 Teste rápido
Criar um pagamento
curl -X POST http://localhost:3000/payments \
     -H "Content-Type: application/json" \
     -d '{"amount": 100}'

Resultado esperado nos logs:

Serviço de pagamento → Transação criada

Serviço de notificação →

"📩 Notificação: Transação recebida"

"✅ Notificação: Transação confirmada"

✅ Critérios atendidos

Serviços independentes (pagamento e notificação).

Comunicação assíncrona via RabbitMQ.

Fluxo completo de processamento de pagamento.


Mizaela e Aline 

[Mizaelaa](https://github.com/Mizaelaa)  
[23Aline](https://github.com/23Aline)

