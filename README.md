# 🛒 Microsserviços de Pagamento e Notificação

Microserviço de pagamento e notificação desenvolvido em Node.js, utilizando Postgres como banco de dados e RabbitMQ como sistema de mensageria.

O projeto implementa um fluxo assíncrono de transações, notificando o usuário sobre a solicitação e confirmação do pagamento.

## Tecnologias Utilizadas
- **Node.js (Express)**
- **PostgreSQL**
- **RabbitMQ**
- **Docker & Docker Compose**
- **Nodemon (para desenvolvimento)**

##  Pré-requisitos
- **Node.js >= v22** 
- **Docker e Docker Compose**
- **Git** 

## Clonar o repositório
Abra o terminal em seu computador e use o comando:

```bash
git clone https://github.com/Mizaelaa/ms-payment-notification.git
```
Em seguida:

```bash
cd <nome-do-repositorio>
```

Certifique-se de estar na pasta do projeto principal:

```bash
cd ms-payment-notification
```

Inicie os serviços via Docker Compose:

```bash
docker-compose down -v
```

Em seguida:

```bash
docker-compose up -d
```

Entre nas pastas dos serviços e instale as dependências:

```bash
cd payment-service
npm install
npm start
```

```bash
cd ..
cd notification-service
npm install
npm start
```

 ## Subir containers do banco e mensageria
docker-compose up -d

Postgres: localhost:5432

RabbitMQ: localhost:5672

Painel do RabbitMQ: http://localhost:15672

Usuário: guest | Senha: guest

## Fluxo de pagamento

Cliente envia requisição POST /payments para o serviço de pagamento.

Serviço de pagamento armazena transação no banco com status pendente.

Serviço de pagamento publica mensagem no RabbitMQ.

Serviço de notificação consome a mensagem e notifica o usuário (console).

Após alguns segundos, pagamento é confirmado → status atualizado para sucesso.

Serviço de pagamento envia nova mensagem.

Serviço de notificação recebe e envia notificação de confirmação.

## Teste rápido
Criar um pagamento (Você pode usar o terminal ou ferramentas como Postman para testar):

```bash
curl -X POST http://localhost:3001/transactions \
```

```bash
H "Content-Type: application/json" \
```

 ```bash
-d "{\"user_email\":\"teste@exemplo.com\",\"amount\":100}"
```

## Resultado esperado nos logs:

Serviço de pagamento → Transação criada

Serviço de notificação →

"📩 Notificação: Transação recebida"

"✅ Notificação: Transação confirmada"

✅ Critérios atendidos

Serviços independentes (pagamento e notificação).

Comunicação assíncrona via RabbitMQ.

Fluxo completo de processamento de pagamento.


### Mizaela e Aline 

- [Mizaelaa](https://github.com/Mizaelaa)  
- [23Aline](https://github.com/23Aline)

