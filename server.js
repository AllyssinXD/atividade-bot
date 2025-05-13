// server.js

require('dotenv').config(); // Variáveis de ambiente
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Rotas
const userRoutes = require('./routes/userRoutes')
const authRoutes = require('./routes/authRoutes');
const turmaRoutes = require('./routes/turmaRoutes');
const atividadeRoutes = require('./routes/atividadeRoutes');
const postsPublicosRoutes = require('./routes/PostPublicoRoutes');
const replyRoutes = require('./routes/replyRoutes');
const getWhatsappRouter = require('./routes/whatsappRoutes');
const whatsappNotificationRoutes = require('./routes/whatsappNotificationRoutes') 

const {getAllPendingWhatsappNotifications, sendAllPendingWhatsappNotifications} = require('./controllers/whatsappNotificationsController')

// Inicializando o app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conectando ao MongoDB
const MONGO_URI = process.env.MONGO_URI;

// Usando as rotas
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/turmas', turmaRoutes);
app.use('/api/atividades', atividadeRoutes);
app.use('/api/publicPosts', postsPublicosRoutes);
app.use('/api/reply', replyRoutes);
app.use('/api/whatsapp', getWhatsappRouter())
app.use('/api/whatsappNotifications', whatsappNotificationRoutes)

// Rota raiz
app.get('/', (req, res) => {
  res.send('Sistema de Lembretes Estudantis Online 📚');
});

// Mongoose Connection
async function connectDB(){
  try{
    await mongoose.connect(MONGO_URI, {
      serverApi: {version: '1', strict: true, deprecationErrors: true},
      dbName: "estudant-whatsapp-reminder"
    })
    await mongoose.connection.db?.admin().command({ ping: 1 });

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  }catch(err){
    console.log("Error connecting with Mongo : " + err)
  }
}

// Inicializar servidor
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  connectDB();
  console.log("Conectado ao MongoDB com sucesso!");

  startSeekingAttributions()
});

async function startSeekingAttributions(){

  sendAllPendingWhatsappNotifications()

  setInterval(async ()=>{
    sendAllPendingWhatsappNotifications()
  }, 1000*60*60)

}
