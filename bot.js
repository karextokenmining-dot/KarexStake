const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');

const token = '8284256760:AAE1CMFjJZTyN6BOonubmCIsu6JtPi-0vC4';
const bot = new TelegramBot(token,{polling:true});

bot.onText(/\/start/, (msg)=>{
    const chatId = msg.chat.id;
    const username = msg.from.username || `user${chatId}`;
    const sql = "INSERT IGNORE INTO users (username,password,balanceKRX,balanceTON) VALUES (?, 'bot_generated', 0, 100)";
    db.query(sql,[username],(err,result)=>{
        if(err) console.log(err);
        bot.sendMessage(chatId, `Hoşgeldin ${username}! Otomatik kayıt yapıldı.`);
    });
});
