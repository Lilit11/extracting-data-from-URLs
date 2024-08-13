require("dotenv").config();

const { MongoClient } = require("mongodb");
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3001;

const client = new MongoClient(MONGO_URI);
const bodyParser = require("body-parser");
const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const pdfParse = require("pdf-parse");

const app = express();
app.use(bodyParser.json());

client.connect();
const db = client.db("engine");
const wordsColl = db.collection("words");

app.post("/crawl", async (req, res) => {
  let text = undefined;
  const url = req.body.url;
  if (!url) {
    return res.status(400).send("please provide url");
  }

  const result = await axios.get(url);
  const contentType = result.headers["content-type"]
    .split(";")[0]
    .split("/")[1];
  if (contentType == "html") {
    const document = cheerio.load(result.data);
    text = document("body").text();
  } else if (contentType == "plain") {
    text = result.data;
  } else if (contentType == "pdf") {
    const finalResult = await axios.get(url, {
      responseType: "arraybuffer",
    });
    initialData = finalResult.data;
    text = await pdfParse(initialData).then((data) => data.text);
  }
  if (!text) {
    return res.status(400).send("Please provide valid url");
  }

  const arrOfWords = text.split(/\s+/);
  const insertionArr = arrOfWords.map((w) => ({ word: w, url: url }));
  await wordsColl.insertMany(insertionArr);
  return res.status(200).send("Inserted successfully");
});

app.get("/search", async (req, res) => {
  const query = req.query.word;
  const result = await wordsColl.find({word:query}).toArray();
  res.status(200).send(result);
});

app.listen(PORT, () => {
  console.log("Server is running on port ", PORT);
});
