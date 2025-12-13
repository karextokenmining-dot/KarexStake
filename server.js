import express from 'express';
import client from './db.js'; // Postgres DB
import bodyParser from 'body-parser';
import './bot.js'; // Bot'u burada başlatıyoruz

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('.'));

// ------------------ Kullanıcı ------------------
// Kayıt ol
app.post('/register', async (req,res)=>{
    const {username,password} = req.body;
    if(!username||!password) return res.json({success:false,message:"Eksik bilgi"});
    try{
        await client.query(
            'INSERT INTO users(username,password,balanceKRX,balanceTON) VALUES($1,$2,0,100) ON CONFLICT DO NOTHING',
            [username,password]
        );
        res.json({success:true});
    }catch(e){ res.json({success:false,message:e.message}); }
});

// Login
app.post('/login', async (req,res)=>{
    const {username,password} = req.body;
    const {rows} = await client.query('SELECT * FROM users WHERE username=$1 AND password=$2',[username,password]);
    if(rows.length===0) return res.json({success:false,message:"Hatalı kullanıcı veya şifre"});
    res.json({success:true});
});

// Balance
app.get('/balance/:username', async (req,res)=>{
    const {username} = req.params;
    const {rows} = await client.query('SELECT balanceKRX,balanceTON FROM users WHERE username=$1',[username]);
    if(rows.length===0) return res.json({balanceKRX:0,balanceTON:0});
    res.json(rows[0]);
});

// Mining
app.post('/mine/:username', async (req,res)=>{
    const {username} = req.params;
    const mined = Math.floor(Math.random()*5)+1;
    await client.query('UPDATE users SET balanceKRX = balanceKRX + $1 WHERE username=$2',[mined,username]);
    res.json({success:true,mined});
});

// ------------------ Market ------------------
app.get('/market', async (req,res)=>{
    const {rows} = await client.query('SELECT * FROM market');
    const market = {};
    rows.forEach(r=>market[r.id]=r);
    res.json(market);
});

app.post('/buy/:username/:itemId', async (req,res)=>{
    const {username,itemId} = req.params;
    const {rows:userRows} = await client.query('SELECT * FROM users WHERE username=$1',[username]);
    if(userRows.length===0) return res.json({success:false});
    const user = userRows[0];

    const {rows:itemRows} = await client.query('SELECT * FROM market WHERE id=$1',[itemId]);
    if(itemRows.length===0) return res.json({success:false,message:"Ürün yok"});
    const item = itemRows[0];

    if(user.balanceton < item.priceton) return res.json({success:false,message:"Yetersiz TON"});

    await client.query('UPDATE users SET balanceKRX=$1,balanceTON=$2 WHERE username=$3',
        [user.balancekrx+item.amountkrx, user.balanceton-item.priceton, username]
    );
    res.json({success:true,balanceKRX:user.balancekrx+item.amountkrx,balanceTON:user.balanceton-item.priceton});
});

// ------------------ Görevler ------------------
app.get('/tasks', async (req,res)=>{
    const {rows} = await client.query('SELECT * FROM tasks');
    const tasks = {};
    rows.forEach(r=>tasks[r.id]=r);
    res.json(tasks);
});

app.post('/complete-task/:username/:taskId', async (req,res)=>{
    const {username,taskId} = req.params;
    const {rows:taskRows} = await client.query('SELECT * FROM tasks WHERE id=$1',[taskId]);
    if(taskRows.length===0) return res.json({success:false,message:"Görev yok"});
    const task = taskRows[0];

    const {rows:userRows} = await client.query('SELECT * FROM users WHERE username=$1',[username]);
    if(userRows.length===0) return res.json({success:false});
    const user = userRows[0];

    await client.query('UPDATE users SET balanceKRX=$1 WHERE username=$2',[user.balancekrx+task.rewardkrx,username]);
    res.json({success:true,balanceKRX:user.balancekrx+task.rewardkrx});
});

// ------------------ Duyurular ------------------
app.get('/announcements', async (req,res)=>{
    const {rows} = await client.query('SELECT * FROM announcements ORDER BY date DESC');
    const announcements = {};
    rows.forEach(r=>announcements[r.id]=r);
    res.json(announcements);
});

// ------------------ Admin ------------------
const ADMIN_PASS = process.env.ADMIN_PASS || "karexadmin123";

app.post('/admin/add-market-item', async (req,res)=>{
    const {password,id,name,amountKRX,priceTON} = req.body;
    if(password!==ADMIN_PASS) return res.json({success:false});
    await client.query('INSERT INTO market(id,name,amountKRX,priceTON) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [id,name,amountKRX,priceTON]
    );
    res.json({success:true});
});

app.post('/admin/add-task', async (req,res)=>{
    const {password,id,title,rewardKRX} = req.body;
    if(password!==ADMIN_PASS) return res.json({success:false});
    await client.query('INSERT INTO tasks(id,title,rewardKRX) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
        [id,title,rewardKRX]
    );
    res.json({success:true});
});

app.post('/admin/add-announcement', async (req,res)=>{
    const {password,text} = req.body;
    if(password!==ADMIN_PASS) return res.json({success:false});
    await client.query('INSERT INTO announcements(text,date) VALUES($1,NOW())',[text]);
    res.json({success:true});
});

// ------------------ Başlat ------------------
app.listen(port,()=>console.log(`Server çalışıyor: ${port}`));
