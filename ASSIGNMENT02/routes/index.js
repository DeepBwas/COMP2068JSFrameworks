require('dotenv').config();
var express = require('express');
var router = express.Router();
const MongoClient = require('mongodb').MongoClient;

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

client.connect(err => {
  if (err) {
    console.error('Failed to connect to MongoDB', err);
    return;
  }
  console.log('Connected to MongoDB');
  const db = client.db("yourDatabaseName");
  const collection = db.collection("yourCollectionName");

  // You can add routes that interact with MongoDB here
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Home - PicsForge' });
});

/* GET login page. */
router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Login - PicsForge' });
});

/* GET register page. */
router.get('/register', function(req, res, next) {
  res.render('register', { title: 'Register - PicsForge' });
});

// Add more routes here that do not require MongoDB connection

module.exports = router;