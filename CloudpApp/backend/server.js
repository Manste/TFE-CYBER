const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const multer = require("multer");

mongoose.connect("mongodb://localhost:27017/alarmDB", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Failed to connect to MongoDB:", err));

const alarmSchema = new mongoose.Schema({
  name: String,
  image: Buffer,
  timestamp: { type: Date, default: Date.now }
});

const Alarm = mongoose.model("Alarm", alarmSchema);

const app = express();
const port = 5000;

app.use(bodyParser.json());

// Multer for handling file uploads
const upload = multer();

// Endpoint for storing the encrypted data (name + image)
app.post("/api/alarm", upload.single("file"), (req, res) => {
  const encryptedName = req.body.name;  // Encrypted name from the frontend
  const encryptedImage = req.file.buffer;  // Encrypted image from the frontend

  const newAlarm = new Alarm({
    name: encryptedName,
    image: encryptedImage
  });

  newAlarm.save()
    .then(() => res.status(200).send("Encrypted data stored successfully"))
    .catch(err => res.status(500).send("Error saving encrypted data:", err));
});

app.listen(port, () => {
  console.log(`Backend is running on http://localhost:${port}`);
});
