const Express = require("express");
const cors = require("cors");
const http = require("http");
const app = Express();
const port = process.env.PORT || 8000;
app.use(cors());
const deployRout = require("./src/router/deployRouter");
app.use(Express.json());

app.get("/", (req, res) => {
  res.render("index", { title: "app", message: "hellow" });
});

app.use("/api/deploy", deployRout);
const server = http.createServer(app);

server.listen(port, () => console.log(`run on port ${port}`));
