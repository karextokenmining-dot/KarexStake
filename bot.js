import './bot.js'; // Bot sadece bir kere burada başlatılacak
import TelegramBot from 'node-telegram-bot-api';
import client from './db.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token,{polling:true});

bot.onText(/\/start/, async (msg)=>{
    const chatId = msg.chat.id;
    const username = msg.from.username || `user${chatId}`;

    await client.query(
        'INSERT INTO users(username,password,balanceKRX,balanceTON) VALUES($1,$2,0,100) ON CONFLICT DO NOTHING',
        [username,'bot_generated']
    );

    bot.sendMessage(chatId, `Hoşgeldin ${username}! Otomatik kayıt yapıldı.`);
});
