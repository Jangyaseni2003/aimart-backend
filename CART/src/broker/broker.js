const amqplib = require("amqplib");

let channel, connection;
let connecting = null;

async function connect() {
  if (channel && connection) return connection;
  if (connecting) return connecting;

  connecting = (async () => {
    while (true) {
      try {
        connection = await amqplib.connect(process.env.RABBIT_URL);
        channel = await connection.createChannel();

        connection.on("close", () => {
          console.error("RabbitMQ connection closed, will reconnect on next use");
          connection = null;
          channel = null;
        });
        connection.on("error", (error) => {
          console.error("RabbitMQ connection error:", error.message);
        });

        console.log("Connected to RabbitMQ");
        return connection;
      } catch (error) {
        console.error(
          "Error connecting to RabbitMQ, retrying in 3s:",
          error.message
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

async function publishToQueue(queueName, data = {}) {
  if (!channel || !connection) await connect();

  await channel.assertQueue(queueName, {
    durable: true,
  });

  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)));
  console.log("Message sent to queue:", queueName, data);
}

async function subscribeToQueue(queueName, callback) {
  if (!channel || !connection) await connect();

  await channel.assertQueue(queueName, {
    durable: true,
  });

  channel.consume(queueName, async (msg) => {
    if (msg !== null) {
      const data = JSON.parse(msg.content.toString());
      await callback(data);
      channel.ack(msg);
    }
  });
}

module.exports = {
  connect,
  channel,
  connection,
  publishToQueue,
  subscribeToQueue,
};
