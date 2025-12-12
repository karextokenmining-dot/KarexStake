import express from "express";
import cors from "cors";
import pool from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// TEST ENDPOINT
app.get("/", (req, res) => {
  res.send("KAREX API çalışıyor 🚀");
});

// BAKİYE ENDPOINT
app.get("/api/balance/:tgId", async (req, res) => {
  try {
    const { tgId } = req.params;

    const q = await pool.query(`
      SELECT b.points FROM balances b
      JOIN users u ON u.id = b.user_id
      WHERE u.tg_id = $1
    `, [tgId]);

    res.json({ balance: q.rows[0]?.points || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 API running on port", PORT);
});
