require("dotenv").config();
const express = require("express");
const router = express.Router();
const MongoClient = require("mongodb").MongoClient;

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const { isAuthenticated } = require("./auth");

client.connect((err) => {
  if (err) {
    console.error("Failed to connect to MongoDB", err);
    return;
  }
  console.log("Connected to MongoDB");
  const db = client.db("PicsForge_db");
});

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Welcome - PicsForge" });
});

/* GET login page. */
router.get("/login", function (req, res, next) {
  res.render("login", { title: "Login - PicsForge" });
});

/* GET register page. */
router.get("/register", function (req, res, next) {
  res.render("register", { title: "Register - PicsForge" });
});

/* GET notification test page. */
router.get("/test-notifications", (req, res) => {
  res.render("test-notifications");
});

/* POST clear notifications. */
router.post("/clear-notifications", (req, res) => {
  if (req.session) {
    delete req.session.notifications;
  }
  res.sendStatus(200);
});

/* GET home page. */
router.get("/home", isAuthenticated, (req, res) => {
  res.render("home", { title: "Home - PicsForge" });
});

/* GET profile page. */
router.get("/profile", isAuthenticated, (req, res) => {
  res.render("profile", { title: "Profile - PicsForge" });
});

module.exports = router;
