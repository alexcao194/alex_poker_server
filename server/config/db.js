const mongoose = require('mongoose');
const config = require('../config');

const connectDB = async () => {
  try {
    const db = await mongoose.connect('mongodb+srv://admin:admin@poker.uttfuf3.mongodb.net/?retryWrites=true&w=majority', {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    });
    console.log('Successfully connected to MongoDB!');

    return db;
  } catch (err) {
    console.error(err)
    // process.exit(-1);
  }
};

module.exports = connectDB;
