import express from "express";
import path from "path";
import fs from "fs/promises";
import cors from "cors";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

import { generateHTML } from "./src/generateHTML.js";

// File path
const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, "db.json");

// Configure lowdb to write to JSONFile
const adapter = new JSONFile(file);
const db = new Low(adapter);

// Read data from JSON file, this will set db.data content
await db.read();

console.log(db.data);
if (!db.data) {
  db.data ||= { recipeTemplate: [] };
  await db.write();
}

const app = express();

app.use(cors());
app.use(express.json());

const port = 9000;

app.use(express.static(path.join(__dirname, "public")));

// app.get("/", function (req, res) {
//   res.sendFile(path.join(__dirname, "public", "index.html"));
// });

app.get("/template-tree", (req, res) => {
  console.log("db.data", db.data);

  res.status(200).send(db.data.recipeTemplate);
});

app.post("/generate", async function (req, res, next) {
  // console.log("req", req.body);
  try {
    const generatedHTML = generateHTML(req.body.treeData);

    await fs.writeFile(
      path.join(__dirname, "public/generated/nmtgTemplate.html"),
      generatedHTML
    );
  } catch (err) {
    console.log(err);
  }

  // if (!generator) {
  //   res.status(400).send('Sorry, cant find that');
  //   return;
  // }

  res.status(200).send();
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
