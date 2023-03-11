const express = require("express");
const path = require("path");
const fs = require("fs/promises");

const app = express();

app.use(express.json());

const port = 9000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/generate", async function (req, res, next) {
  console.log("req", req.body);
  try {
    const result1 = req.body.elements.map((element, index, arr) => {
      if (element.type === "imageBlock") {
        // if (arr[index + 1]?.type === "imageBlock") {
        //   return getRowWithTwoBlocks({
        //     item1: item({
        //       subtitle: element.subtitle,
        //       link: element.link,
        //       image: element.image,
        //       title: element.title,
        //     }),
        //     item2: item({
        //       subtitle: arr[index + 1].subtitle,
        //       link: arr[index + 1].link,
        //       image: arr[index + 1].image,
        //       title: arr[index + 1].title,
        //     }),
        //   });
        // }

        // if (arr[index - 1]?.type === "imageBlock") {
        //   return undefined;
        // }

        return getRowWithTwoBlocks({
          item1: item({
            subtitle: element.subtitle,
            link: element.link,
            image: element.image,
            title: element.title,
          }),
        });
      }
    });

    const content = generateFullTemplate({
      elements: result1.join(" "),
    });

    await fs.writeFile(
      path.join(__dirname, "public/generated/nmtgTemplate.html"),
      content
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
