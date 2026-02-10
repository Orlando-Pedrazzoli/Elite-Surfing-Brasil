// server.js - Elite Surfing Brasil
import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';
import connectDB from './configs/db.js';
import 'dotenv/config';
import userRouter from './routes/userRoute.js';
import sellerRouter from './routes/sellerRoute.js';
import connectCloudinary from './configs/cloudinary.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import addressRouter from './routes/addressRoute.js';
import orderRouter from './routes/orderRoute.js';
import reviewRouter from './routes/reviewRoute.js';
import { stripeWebhooks } from './controllers/orderController.js';

const app = express();
const port = process.env.PORT || 4001;

// ✅ Conexões
await connectDB();
await connectCloudinary();

console.log('✅ Database connected successfully');
console.log('✅ Cloudinary connected successfully');

// ✅ Allowed Origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://elitesurfingbr.vercel.app',
  'http://localhost:4001',
  'http://localhost:3000',
  'https://elitesurfing.com.br',
  'https://www.elitesurfing.com.br',
  'https://elitesurfingbr-backend.vercel.app',
];

// ✅ Stripe webhook ANTES de express.json (precisa de raw body)
app.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhooks);

// ✅ CORS PRIMEIRO - antes de qualquer body parsing
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ✅ Depois CORS, body parsing e cookies
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ✅ Health check
app.get('/', (req, res) => {
  res.json({
    message: 'Elite Surfing Brasil API is Working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    webhook: '/stripe',
  });
});

// ✅ Rotas principais
app.use('/api/user', userRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/address', addressRouter);
app.use('/api/order', orderRouter);
app.use('/api/reviews', reviewRouter);

console.log('✅ All routes registered');

// ✅ 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedPath: req.originalUrl,
  });
});

// ✅ Server startup
const isVercel = !!process.env.VERCEL;
if (!isVercel) {
  app.listen(port, () => {
    console.log(`🚀 Server running on PORT: ${port}`);
  });
}

export default app;