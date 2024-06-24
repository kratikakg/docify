const mongoose = require("mongoose");
const Document = require("./Document");

const defaultValue = "";

async function connectToMongoDB() {
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://127.0.0.1/docify"
  );
}

connectToMongoDB().then(() => {
  const io = require("socket.io")(process.env.PORT || 3001, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("get-document", async (documentId) => {
      const document = await findOrCreateDocument(documentId);
      socket.join(documentId);
      socket.emit("load-document", document.data);

      socket.on("send-changes", (delta) => {
        socket.broadcast.to(documentId).emit("receive-changes", delta);
      });

      socket.on("save-document", async (data) => {
        await Document.findByIdAndUpdate(documentId, { data });
      });
    });
  });
});

async function findOrCreateDocument(id) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;
  return await Document.create({ _id: id, data: defaultValue });
}
