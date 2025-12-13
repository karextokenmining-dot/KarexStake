const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('.'));
app.use(express.json());

// Dosya yolları
const USERS_FILE = path.join(__dirname, 'users.json');
const MARKET_FILE = path.join(__dirname, 'market.json');
const TASKS_FILE = path.join(__dirname, 'tasks.json');
const ANNOUNCE_FILE = path.join(__dirname, 'announcements.json');

// JSON okuma/yazma
function readJSON(file) {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file));
}
function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// -------------------- Kullanıcı İşlemleri --------------------

// Kayıt
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, message: "Eksik bilgi" });

    const users = readJSON(USERS_FILE);
    if (users[username]) return res.json({ success: false, message: "Kullanıcı zaten var" });

    users[username] = { password, balanceKRX: 0, balanceTON: 100, history: [] }; // 100 TON başlangıç
    writeJSON(USERS_FILE, users);
    res.json({ success: true });
});

// Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = readJSON(USERS_FILE);
    if (!users[username] || users[username].password !== password) {
        return res.json({ success: false, message: "Hatalı kullanıcı veya şifre" });
    }
    res.json({ success: true });
});

// -------------------- Mining --------------------
app.get('/balance/:username', (req, res) => {
    const users = readJSON(USERS_FILE);
    const user = users[req.params.username];
    if (!user) return res.json({ balanceKRX: 0, balanceTON: 0 });
    res.json({ balanceKRX: user.balanceKRX, balanceTON: user.balanceTON });
});

app.post('/mine/:username', (req, res) => {
    const users = readJSON(USERS_FILE);
    const user = users[req.params.username];
    if (!user) return res.json({ success: false });

    const mined = Math.floor(Math.random() * 5) + 1;
    user.balanceKRX += mined;
    user.history.push({ type: "mine", date: new Date().toISOString(), amount: mined });
    writeJSON(USERS_FILE, users);

    res.json({ success: true, balanceKRX: user.balanceKRX, mined });
});

// -------------------- Market --------------------

// Market ürünlerini getir
app.get('/market', (req, res) => {
    const market = readJSON(MARKET_FILE);
    res.json(market);
});

// KRX satın alma
app.post('/buy/:username/:itemId', (req, res) => {
    const users = readJSON(USERS_FILE);
    const user = users[req.params.username];
    if (!user) return res.json({ success: false });

    const market = readJSON(MARKET_FILE);
    const item = market[req.params.itemId];
    if (!item) return res.json({ success: false, message: "Ürün yok" });

    if (user.balanceTON < item.priceTON) return res.json({ success: false, message: "Yetersiz TON" });

    user.balanceTON -= item.priceTON;
    user.balanceKRX += item.amountKRX;
    user.history.push({ type: "buy", date: new Date().toISOString(), itemId: req.params.itemId, amountKRX: item.amountKRX });
    writeJSON(USERS_FILE, users);
    res.json({ success: true, balanceKRX: user.balanceKRX, balanceTON: user.balanceTON });
});

// -------------------- Görevler --------------------
app.get('/tasks', (req, res) => {
    const tasks = readJSON(TASKS_FILE);
    res.json(tasks);
});

app.post('/complete-task/:username/:taskId', (req, res) => {
    const users = readJSON(USERS_FILE);
    const user = users[req.params.username];
    if (!user) return res.json({ success: false });

    const tasks = readJSON(TASKS_FILE);
    const task = tasks[req.params.taskId];
    if (!task) return res.json({ success: false, message: "Görev yok" });

    // Ödülü ekle ve history'ye yaz
    user.balanceKRX += task.rewardKRX;
    user.history.push({ type: "task", date: new Date().toISOString(), taskId: req.params.taskId, rewardKRX: task.rewardKRX });
    writeJSON(USERS_FILE, users);

    res.json({ success: true, balanceKRX: user.balanceKRX });
});

// -------------------- Duyurular --------------------
app.get('/announcements', (req, res) => {
    const announcements = readJSON(ANNOUNCE_FILE);
    res.json(announcements);
});

// -------------------- Admin Panel --------------------
// Admin basit şifre ile erişim sağlansın
const ADMIN_PASS = "karexadmin123";

app.post('/admin/add-market-item', (req, res) => {
    const { password, id, name, amountKRX, priceTON } = req.body;
    if (password !== ADMIN_PASS) return res.json({ success: false });

    const market = readJSON(MARKET_FILE);
    market[id] = { name, amountKRX, priceTON };
    writeJSON(MARKET_FILE, market);
    res.json({ success: true });
});

app.post('/admin/add-announcement', (req, res) => {
    const { password, text } = req.body;
    if (password !== ADMIN_PASS) return res.json({ success: false });

    const announcements = readJSON(ANNOUNCE_FILE);
    const id = Date.now();
    announcements[id] = { text, date: new Date().toISOString() };
    writeJSON(ANNOUNCE_FILE, announcements);
    res.json({ success: true });
});

app.post('/admin/add-task', (req, res) => {
    const { password, id, title, rewardKRX } = req.body;
    if (password !== ADMIN_PASS) return res.json({ success: false });

    const tasks = readJSON(TASKS_FILE);
    tasks[id] = { title, rewardKRX };
    writeJSON(TASKS_FILE, tasks);
    res.json({ success: true });
});

app.listen(port, () => {
    console.log(`Server çalışıyor: http://localhost:${port}`);
});
