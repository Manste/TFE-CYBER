const { createServer } = require("https");
const { parse } = require("url");
const next = require("next");
const fs = require("fs");
require("dotenv").config();

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync("./certificate/backend_server_encrypted.key"),
  cert: fs.readFileSync("./certificate/backend_server_chain.crt"),
  passphrase: process.env.KEY_PASSPHRASE, // Add passphrase to environment
};

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, (err) => {
    if (err) throw err;
    console.log("Frontend running at https://localhost:3000");
  });
});
