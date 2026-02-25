const express = require("express");
require("dotenv").config();
const connectDB = require("./config/db");
const multer = require("multer");
const imagekit = require("./config/imagekit");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const productRoutes = require("./routes/productsRoutes");
const cardRoutes = require("./routes/cardRoutes");
const orderRoutes = require("./routes/orderRoutes");
const categoryRoutes = require("./routes/categoryRoutes")

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use(cors());



(async () => {
  global.db = await connectDB();
})();

app.use("/users", userRoutes);
app.use("/products", productRoutes);
app.use("/cards", cardRoutes);
app.use("/orders", orderRoutes);
app.use("/categories", categoryRoutes);

// login and registration
app.post("/employee_register", userRoutes);
app.post("/employee_login", userRoutes);
app.post("/client_register", userRoutes);
app.post("/client_login", userRoutes);

// tokens
app.post("/refresh_token", userRoutes);

// products
app.post("/add_product", productRoutes);
app.get("/get_products", productRoutes);
app.delete("/delete_product/:id", productRoutes);
app.patch("/edit_product/:id", productRoutes);

//cards
app.post("/generate_card", cardRoutes);
app.post("/charge_card", cardRoutes);

// Orders
app.post("/preview_cart", orderRoutes);
app.post("/add_order", orderRoutes);
app.get("/get_orders", orderRoutes);
app.patch("/track_order", orderRoutes);
app.delete("/delete_order", orderRoutes);

// Categories
app.get("/get_categories", categoryRoutes)

app.get("/test", async (req, res) => {
  try {
    const rows = await db.query("select * from roles");
    return res.status(200).json({ rows: rows });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "internal Server Error" });
  }
});

const PORT = process.env.PORT || 3000;

// sending request every 5 minutes using cronjob to prevent render from sleeping
app.get("/", (req, res) => {
  res.send("🚀 CRM Backend Running!");
});

app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
