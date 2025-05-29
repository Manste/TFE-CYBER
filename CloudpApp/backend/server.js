require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const multer = require("multer");
const cors = require("cors");
const Alarm = require('./models/alarms');
const cookie_parser = require('cookie-parser');

mongoose.connect(process.env.DATABASE_URL, {})
.then((res) => {
  console.log('connected to the database')
})
.catch((error) => {
  console.log(error)
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cookie_parser())
app.use(cors({
  credentials: true,
  origin: "*"
}));
app.use(bodyParser.json());

const upload = multer();

// Store new alarms & notify frontend
app.post("/api/alarm", upload.single("file"), async (req, res) => {
  try {
    const newAlarm = new Alarm({
      name: req.body.name,
      image: req.file.buffer,
    });

    await newAlarm.save();

    io.emit("newAlarm", {
      _id: newAlarm._id,
      name: newAlarm.name,
      image: newAlarm.image.toString("base64"),
      timestamp: newAlarm.timestamp,
    });

    res.status(200).send("Alarm stored & broadcasted");
  } catch (err) {
    res.status(500).send("Error saving alarm: "  + err);
  }
});

// Manage alarms
app.use("/api/alarms", require("./routes/alarmRoutes"));

server.listen(process.env.PORT, () => {
  console.log(`Backend running on http://localhost:${process.env.PORT}`);
});
