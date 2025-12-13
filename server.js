const express = require('express');
const app = express();
const db = require('./db'); // GitHub’daki hazır db.js
const port = process.env.PORT || 3000;

app.use(express.static('.'));
app.use(express.json());

// ------------------ Kullanıcı ------------------
// Kayıt ol
app.post('/register', (req,res)=>{
    const {username,password} = req.body;
    if(!username || !password) return res.json({success:false,message:"Eksik bilgi"});

    const sql = "INSERT INTO users (username,password,balanceKRX,balanceTON) VALUES (?,?,0,100)";
    db.query(sql,[username,password],(err,result)=>{
        if(err) return res.json({success:false,message:"Kullanıcı zaten var veya hata"});
        res.json({success:true});
    });
});

// Login
app.post('/login', (req,res)=>{
    const {username,password} = req.body;
    const sql = "SELECT * FROM users WHERE username=? AND password=?";
    db.query(sql,[username,password],(err,results)=>{
        if(err || results.length===0) return res.json({success:false,message:"Hatalı kullanıcı veya şifre"});
        res.json({success:true});
    });
});

// Balance
app.get('/balance/:username',(req,res)=>{
    const username = req.params.username;
    const sql = "SELECT balanceKRX,balanceTON FROM users WHERE username=?";
    db.query(sql,[username],(err,results)=>{
        if(err || results.length===0) return res.json({balanceKRX:0,balanceTON:0});
        res.json(results[0]);
    });
});

// Mining
app.post('/mine/:username',(req,res)=>{
    const username = req.params.username;
    const mined = Math.floor(Math.random()*5)+1;
    const sql = "UPDATE users SET balanceKRX = balanceKRX + ? WHERE username=?";
    db.query(sql,[mined,username],(err,result)=>{
        if(err) return res.json({success:false});
        res.json({success:true,mined});
    });
});

// ------------------ Market ------------------
app.get('/market',(req,res)=>{
    const sql = "SELECT * FROM market";
    db.query(sql,(err,results)=>{
        if(err) return res.json({});
        res.json(results.reduce((acc,row)=>{ acc[row.id]=row; return acc; },{}));
    });
});

app.post('/buy/:username/:itemId',(req,res)=>{
    const username = req.params.username;
    const itemId = req.params.itemId;
    db.query("SELECT * FROM users WHERE username=?",[username],(err,users)=>{
        if(err || users.length===0) return res.json({success:false});
        const user = users[0];
        db.query("SELECT * FROM market WHERE id=?",[itemId],(err,items)=>{
            if(err || items.length===0) return res.json({success:false,message:"Ürün yok"});
            const item = items[0];
            if(user.balanceTON < item.priceTON) return res.json({success:false,message:"Yetersiz TON"});
            const newKRX = user.balanceKRX + item.amountKRX;
            const newTON = user.balanceTON - item.priceTON;
            db.query("UPDATE users SET balanceKRX=?, balanceTON=? WHERE username=?",[newKRX,newTON,username],()=>{
                res.json({success:true,balanceKRX:newKRX,balanceTON:newTON});
            });
        });
    });
});

// ------------------ Görevler ------------------
app.get('/tasks',(req,res)=>{
    db.query("SELECT * FROM tasks",(err,results)=>{
        if(err) return res.json({});
        res.json(results.reduce((acc,row)=>{ acc[row.id]=row; return acc; },{}));
    });
});

app.post('/complete-task/:username/:taskId',(req,res)=>{
    const username = req.params.username;
    const taskId = req.params.taskId;
    db.query("SELECT * FROM tasks WHERE id=?",[taskId],(err,tasks)=>{
        if(err || tasks.length===0) return res.json({success:false,message:"Görev yok"});
        const task = tasks[0];
        db.query("SELECT * FROM users WHERE username=?",[username],(err,users)=>{
            if(err || users.length===0) return res.json({success:false});
            const user = users[0];
            const newKRX = user.balanceKRX + task.rewardKRX;
            db.query("UPDATE users SET balanceKRX=? WHERE username=?",[newKRX,username],()=>{
                res.json({success:true,balanceKRX:newKRX});
            });
        });
    });
});

// ------------------ Duyurular ------------------
app.get('/announcements',(req,res)=>{
    db.query("SELECT * FROM announcements",(err,results)=>{
        if(err) return res.json({});
        res.json(results.reduce((acc,row)=>{ acc[row.id]=row; return acc; },{}));
    });
});

// ------------------ Admin ------------------
const ADMIN_PASS = "karexadmin123";

app.post('/admin/add-market-item',(req,res)=>{
    const {password,id,name,amountKRX,priceTON} = req.body;
    if(password!==ADMIN_PASS) return res.json({success:false});
    const sql = "INSERT INTO market (id,name,amountKRX,priceTON) VALUES (?,?,?,?)";
    db.query(sql,[id,name,amountKRX,priceTON],()=>res.json({success:true}));
});

app.post('/admin/add-announcement',(req,res)=>{
    const {password,text} = req.body;
    if(password!==ADMIN_PASS) return res.json({success:false});
    const sql = "INSERT INTO announcements (text,date) VALUES (?,NOW())";
    db.query(sql,[text],()=>res.json({success:true}));
});

app.post('/admin/add-task',(req,res)=>{
    const {password,id,title,rewardKRX} = req.body;
    if(password!==ADMIN_PASS) return res.json({success:false});
    const sql = "INSERT INTO tasks (id,title,rewardKRX) VALUES (?,?,?)";
    db.query(sql,[id,title,rewardKRX],()=>res.json({success:true}));
});

app.listen(port,()=>console.log(`Server çalışıyor: ${port}`));
