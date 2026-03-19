require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');

const { BOT_TOKEN, MONGO_URI, ADMIN_ID, CHANNEL_ID } = process.env;
const SHARE_LINK = "https://t.me/+yg8YTJV3Rk0wM2I1";

// --- DATABASE CONNECTION (Singleton Pattern for Vercel) ---
// --- DATABASE CONNECTION (Final Stability Fix) ---
let cachedDb = null;
const connectDB = async () => {
    if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
    try {
        const db = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            dbName: 'BotWelcomeDB'
        });
        cachedDb = db;
        console.log("✅ MongoDB Connected Successfully");
        return db;
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
    }
};

// --- DATA SCHEMA ---
const MemberSchema = new mongoose.Schema({
    userId: { type: Number, unique: true },
    username: String,
    firstName: String,
    referralCount: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now }
});
const Member = mongoose.models.Member || mongoose.model('Member', MemberSchema);

const bot = new Telegraf(BOT_TOKEN);

// --- WELCOME LOGIC ---
bot.on('new_chat_members', async (ctx) => {
    await connectDB();
    const newUser = ctx.message.new_chat_member;
    if (newUser.is_bot) return;

    const userDisplay = newUser.username ? `@${newUser.username}` : newUser.first_name;

    try {
        // Simpan/Update member
        await Member.findOneAndUpdate(
            { userId: newUser.id }, 
            { userId: newUser.id, username: newUser.username, firstName: newUser.first_name }, 
            { upsert: true }
        );

        const total = await Member.countDocuments();
        const nextMilestone = Math.ceil((total + 1) / 300) * 300;

        const welcomeMsg = `
💠 *SYSTEM ONLINE: ACCESS GRANTED* 💠
━━━━━━━━━━━━━━━━━━━━━━
👤 *IDENTITAS MEMBER*
├─ **User:** ${userDisplay}
└─ **ID:** \`${newUser.id}\`

📢 *TARGET KOMUNITAS (2000 MEMBER)*
├─ **Total Saat Ini:** ${total} Member
└─ **Next Reward:** ${nextMilestone} Member (+5 Video)

👋 *WELCOME MESSAGE*
Halo *${newUser.first_name}*! Bantu kami mencapai target. 
Setiap kelipatan 300 member, admin akan kirim 5 video baru!
━━━━━━━━━━━━━━━━━━━━━━
        `;

        await ctx.replyWithMarkdown(welcomeMsg, 
            Markup.inlineKeyboard([
                [Markup.button.callback('📹 UPDATE VIDEO TERBARU', 'btn_video')],
                [Markup.button.callback('🏆 TOP REFERRAL (LEADERBOARD)', 'btn_leaderboard')],
                [Markup.button.callback('📥 DOWNLOAD APP', 'btn_download')],
                [Markup.button.callback('🛠️ INSTALL GUIDE', 'btn_install')],
                [Markup.button.callback('🛡️ OFF PLAY PROTECT', 'btn_protect')],
                [Markup.button.url('🔗 SHARE CHANNEL', SHARE_LINK)],
                [Markup.button.url('💡 SEND FEEDBACK', 'https://t.me/afifahxrat037')]
            ])
        );

        // Hapus notifikasi sistem "X bergabung"
        await ctx.deleteMessage(ctx.message.message_id).catch(() => {});
    } catch (e) { console.error(e); }
});

// --- CALLBACK QUERY: CLICK TO CHANNEL LOG ---
bot.on('callback_query', async (ctx) => {
    await connectDB();
    const data = ctx.callbackQuery.data;
    const user = ctx.from;
    const userDisplay = user.username ? `@${user.username}` : user.first_name;
    const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    try {
        if (data === 'btn_leaderboard') {
            const topMembers = await Member.find().sort({ referralCount: -1 }).limit(5);
            let leaderMsg = "🏆 *TOP REFERRAL LEADERBOARD*\n━━━━━━━━━━━━━━━━━━━━\n";
            topMembers.forEach((m, index) => {
                leaderMsg += `${index + 1}. ${m.firstName} — *${m.referralCount}* Invite\n`;
            });
            leaderMsg += `\n🔗 *Link Share:* ${SHARE_LINK}\n_Ajak temanmu bergabung sekarang!_`;
            return ctx.reply(leaderMsg, { parse_mode: 'Markdown', disable_web_page_preview: true });
        }

        let actionText = "";
        let targetLink = "";
        let infoMsg = "";

        switch(data) {
            case 'btn_video': 
                const total = await Member.countDocuments();
                infoMsg = `📹 *VIDEO UPDATE INFO*\n\nStatus: *${total} / 2000 Member*\n\nSyarat: Share link channel di bawah ini! Setiap kenaikan *300 Member*, admin upload *5 Video Baru*.\n\n🔗 ${SHARE_LINK}`;
                actionText = "Cek Update Video";
                break;
            case 'btn_download': actionText = "Download App"; targetLink = "https://t.me/c/3872252612/5"; break;
            case 'btn_install': actionText = "Install Guide"; targetLink = "https://t.me/c/3872252612/4"; break;
            case 'btn_protect': actionText = "Off Play Protect"; targetLink = "https://t.me/c/3872252612/3"; break;
        }

        // Log ke Channel
        const logMsg = `🔔 *ACTIVITY LOG*\n━━━━━━━━━━━━━━━━━━━━\n👤 **User:** ${userDisplay} (\`${user.id}\`)\n📝 **Aksi:** ${actionText}\n⏰ **Waktu:** ${time}\n━━━━━━━━━━━━━━━━━━━━`;
        await bot.telegram.sendMessage(CHANNEL_ID, logMsg, { parse_mode: 'Markdown' });

        await ctx.answerCbQuery(`Membuka: ${actionText}`);
        
        if (infoMsg) return ctx.reply(infoMsg, { parse_mode: 'Markdown', disable_web_page_preview: true });
        if (targetLink) return ctx.reply(`✅ *${actionText}*:\n${targetLink}`);

    } catch (e) { console.error("Callback Error:", e); }
});

// --- ADMIN COMMANDS ---
bot.command(['stats', 'broadcast', 'reset_leaderboard'], async (ctx) => {
    if (ctx.from.id != ADMIN_ID) return;
    await connectDB();

    if (ctx.message.text.startsWith('/stats')) {
        const total = await Member.countDocuments();
        return ctx.reply(`📊 *BOT STATISTICS*\nTotal Member Terdata: *${total}*`);
    }

    if (ctx.message.text.startsWith('/reset_leaderboard')) {
        await Member.updateMany({}, { $set: { referralCount: 0 } });
        return ctx.reply(`✅ *Leaderboard Berhasil Direset!*`);
    }

    // Broadcast logic
    const msg = ctx.message.text.split(' ').slice(1).join(' ');
    if (!msg) return ctx.reply('❌ Gunakan: /broadcast [pesan]');
    const members = await Member.find({});
    let count = 0;
    for (const m of members) {
        try { 
            await bot.telegram.sendMessage(m.userId, `📢 *ANNOUNCEMENT*\n\n${msg}`, { parse_mode: 'Markdown' }); 
            count++;
        } catch (e) {}
    }
    ctx.reply(`✅ Broadcast terkirim ke ${count} member.`);
});

// --- VERCEL HANDLER ---
module.exports = async (req, res) => {
    try {
        await connectDB();
        if (req.body) await bot.handleUpdate(req.body);
        res.status(200).send('OK');
    } catch (err) { 
        console.error("Vercel Error:", err);
        res.status(500).send('Error'); 
    }
};
