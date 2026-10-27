import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db';
import path from 'node:path';
import { proposalRouter } from './proposals';


dotenv.config();


const app = express();



app.use(cors({
  origin: 'http://localhost:5173'
}));


app.use(express.json({ limit: '16kb' }));
app.use('/api/product-proposals', proposalRouter);



app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to the MiniShop API!'
  });
});



app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    application: 'MiniShop',
    service: 'backend',
    release: process.env.APP_RELEASE || 'development'
  });
});



app.get('/api/db-health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS current_time')

    res.json({
      status: 'ok',
      database: 'connected',
      currentTime: result.rows[0].current_time,
    })
  } catch (error) {
    console.error('Database connection failed:', error)

    res.status(500).json({
      status: 'error',
      database: 'disconnected',
    })
  }
})



app.get('/api/products', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, price, stock_quantity FROM products ORDER BY id'
    );

    res.json({
      status: 'ok',
      count: result.rows.length,
      products: result.rows
    });
  } catch (error) {
    console.error('Failed to retrieve products:', error);

    res.status(500).json({
      status: 'error',
      message: 'Unable to retrieve products.'
    });
  }
});



const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');


app.use(express.static(frontendDistPath));



app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

export default app;
