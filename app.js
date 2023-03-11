const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const { generateHTML } = require("./src/generateHTML");

var cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const port = 9000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "index.html"));
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

// form.on("field", function (name, val) {
//   if (name === "generateTo") {
//     generateTo = val;
//     return;
//   }

//   if (name === "template") {
//     template = val;
//     return;
//   }
// });

// form.parse(req);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
