import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    mongoose.connection.on('connected', () =>
      console.log('Database Connected'),
    );
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10, // Máximo 10 conexões por instância
      minPoolSize: 2, // Mínimo 2 prontas
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  } catch (error) {
    console.error(error.message);
  }
};

export default connectDB;
