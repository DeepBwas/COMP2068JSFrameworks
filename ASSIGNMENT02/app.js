require("dotenv").config();
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const hbs = require("hbs");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const galleryRouter = require('./routes/gallery');

const NotificationManager = require("./services/NotificationManager");

const app = express();

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    // Test the connection
    mongoose.connection.db
      .admin()
      .ping()
      .then(() => console.log("MongoDB ping successful!"))
      .catch((err) => console.error("MongoDB ping failed:", err));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// MongoDB connection event handlers
mongoose.connection.on("error", (err) => {
  console.error("MongoDB error occurred:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
hbs.registerPartials(path.join(__dirname, "views/partials"));
app.set("view engine", "hbs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Passport.js setup
require("./config/passport")(passport);
app.use(
  session({
    secret: "SESSION_SECRET",
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Notification Manager setup
app.use(NotificationManager.setup.bind(NotificationManager));

// Add user to res.locals
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// Register Handlebars helpers
app.locals.json = function (context) {
  return JSON.stringify(context);
};

hbs.registerHelper("json", function (context) {
  return JSON.stringify(context);
});

hbs.registerHelper("getInitials", function (username) {
  if (!username) return "";

  const words = username.split(" ");
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  } else {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
});

// Routes
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/auth", authRouter);
app.use("/", profileRouter);
app.use('/', galleryRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
