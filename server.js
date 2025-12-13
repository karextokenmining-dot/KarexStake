import express from "express";
import cors from "cors";
import pool from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
const pool = require("./db");

app.get("/api/me", async (req, res) => {
  const tgId = req.query.tgId;
  if (!tgId) return res.json({ balance: 0 });

  // kullanıcı var mı?
  let user = await pool.query(
    "SELECT * FROM users WHERE tg_id = $1",
    [tgId]
  );

  if (user.rows.length === 0) {
    // kullanıcı yoksa oluştur
    await pool.query(
      "INSERT INTO users (tg_id) VALUES ($1)",
      [tgId]
    );
    await pool.query(
      "INSERT INTO balances (tg_id, balance) VALUES ($1, 0)",
      [tgId]
    );
  }

  const balanceRes = await pool.query(
    "SELECT balance FROM balances WHERE tg_id = $1",
    [tgId]
  );

  res.json({ balance: balanceRes.rows[0].balance });
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
app.post("/api/topup", async (req, res) => {
  const { tgId, amount } = req.body;

  if (!tgId || !amount) return res.status(400).json({ ok:false });

  // şimdilik direkt ekle (sonra TON tx doğrulama koyacağız)
  await pool.query(
    "UPDATE balances SET balance = balance + $1 WHERE tg_id = $2",
    [amount, tgId]
  );

  res.json({ ok: true });
});
