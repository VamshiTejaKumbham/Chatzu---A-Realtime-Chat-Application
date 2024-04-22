const express = require('express');
const { createServer } = require('http'); 
const { join } = require('path'); 
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb'); 

async function main() {
  const client = new MongoClient('mongodb://localhost:27017'); 
  await client.connect(); 
  const db = client.db('chatApp'); 

  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    connectionStateRecovery: {}
  });

  app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
  });

  io.on('connection', async (socket) => {
    socket.on('chat message', async (msg, clientOffset, callback) => {
      try {
        
        const result = await db.collection('messages').insertOne({
          content: msg,
          clientOffset: clientOffset,
          timestamp: new Date()
        });
        io.emit('chat message', msg, result.insertedId); 
      } catch (e) {
        console.error('Error:', e);
        if (callback) callback(e); 
      }
    });

    if (!socket.recovered) {
      try {
        
        const cursor = db.collection('messages').find({ timestamp: { $gt: new Date(socket.handshake.auth.serverOffset || 0) } });
        await cursor.forEach(doc => {
          socket.emit('chat message', doc.content, doc._id); 
        });
      } catch (e) {
        console.error('Error:', e);
      }
    }
  });

  server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
  });
}

main();
