const Express = require("express");
const cors = require("cors");
const http = require("http");
const mongoose = require("mongoose");
const app = Express();
const port = process.env.PORT || 8000;
const uri = "mongodb://localhost:27017/firebase";
app.use(cors());
const deployRout = require("./src/router/deployRouter");
app.use(Express.json());

app.get("/", (req, res) => {
  res.render("index", { title: "app", message: "hellow" });
});

app.use("/api/deploy", deployRout);
const server = http.createServer(app);
mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // useCreateIndex: true,
    // useFindAndModify: false,
  })
  .then(() => {
    console.info(`✔️ Database Connected (${process.env.NODE_ENV})`);
    server.listen(port, () => console.log(`run on port ${port}`));
  })
  .catch((err) => {
    console.error(`❌ Server Stopped (listening on PORT : ${port})`);
    console.error("❗️ Could not connect to database...", err);
  });
