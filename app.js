import express from "express";
import path from "path";
import fs from "fs/promises";
import cors from "cors";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { deleteItem } from "./src/treeHelpers/deleteItem.js";
import { updateItem } from "./src/treeHelpers/updateItem.js";
import { addNodeTree } from "./src/treeHelpers/addItem.js";
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
app.use(express.json({ limit: "50mb" }));

const port = 9000;

app.use(express.static(path.join(__dirname, "public")));

// app.get("/", function (req, res) {
//   res.sendFile(path.join(__dirname, "public", "index.html"));
// });

app.get("/template-tree", (req, res) => {
  res.status(200).send(db.data.recipeTemplate);
});

app.post("/save-template-tree", async (req, res) => {
  if (!req.body.treeData) {
    res.status(400).send();
    return;
  }

  await db.read();
  db.data.recipeTemplate = req.body.treeData;
  await db.write();
  res.status(200).send();
});

app.post("/update-node-tree", async (req, res) => {
  await db.read();

  const modified = updateItem(req.body, db.data.recipeTemplate);
  db.data.recipeTemplate = modified;

  await db.write();
  res.status(200).send();
});

app.post("/delete-node-tree", async (req, res) => {
  await db.read();

  const modified = deleteItem(req.body.key, db.data.recipeTemplate);
  db.data.recipeTemplate = modified;

  await db.write();
  res.status(200).send();
});

app.post("/add-node-tree", async (req, res) => {
  await db.read();

  const { parentKey, item } = req.body;
  const modified = addNodeTree(item, db.data.recipeTemplate, parentKey);
  db.data.recipeTemplate = modified;
  await db.write();
  res.status(200).send();
});

app.post("/generate", async function (req, res, next) {
  // console.log("req", req.body);
  try {
    await db.read();
    const generatedHTML = generateHTML(db.data.recipeTemplate);

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
