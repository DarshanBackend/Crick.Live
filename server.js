import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes.js';
import cricketRoutes from './routes/cricket.routes.js';
import couponRoutes from './routes/coupon.routes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    req.io = io;
    next();
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB error:', err));

app.use('/api/v1', cricketRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/coupon', couponRoutes);

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ 
        success: false, 
        message: err.message || 'Server error' 
    });
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));