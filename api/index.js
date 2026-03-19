require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

const { BOT_TOKEN, ADMIN_ID, CHANNEL_ID } = process.env;
const SHARE_LINK = "https://t.me/+yg8YTJV3Rk0wM2I1";

// Simulasi Counter (Karena tanpa DB, angka ini akan reset saat Vercel restart)
// Kita gunakan angka awal yang terlihat ramai untuk profesionalisme
let totalMemberSimulated = 1240; 

const bot = new Telegraf(BOT_TOKEN);

// --- WELCOME LOGIC ---
bot.on('new_chat_members', async (ctx) => {
    const newUser = ctx.message.new_chat_member;
    if (newUser.is_bot) return;

    totalMemberSimulated++; // Tambah counter setiap ada yang masuk
    const userDisplay = newUser.username ? `@${newUser.username}` : newUser.first_name;
    const nextMilestone = Math.ceil(totalMemberSimulated / 300) * 300;

    try {
        const welcomeMsg = `
💠 *SYSTEM ONLINE: ACCESS GRANTED* 💠
━━━━━━━━━━━━━━━━━━━━━━
👤 *IDENTITAS MEMBER*
├─ **User:** ${userDisplay}
└─ **ID:** \`${newUser.id}\`

📢 *TARGET KOMUNITAS (2000 MEMBER)*
├─ **Total Saat Ini:** ${totalMemberSimulated} Member
└─ **Next Reward:** ${nextMilestone} Member (+5 Video)

👋 *WELCOME MESSAGE*
Halo *${newUser.first_name}*! Bantu kami mencapai target. 
Setiap kelipatan 300 member, admin akan kirim 5 video baru!
━━━━━━━━━━━━━━━━━━━━━━
        `;

        await ctx.replyWithMarkdown(welcomeMsg, 
            Markup.inlineKeyboard([
                [Markup.button.callback('📹 UPDATE VIDEO TERBARU', 'btn_video')],
                [Markup.button.callback('📥 DOWNLOAD APP', 'btn_download')],
                [Markup.button.callback('🛠️ INSTALL GUIDE', 'btn_install')],
                [Markup.button.callback('🛡️ OFF PLAY PROTECT', 'btn_protect')],
                [Markup.button.url('🔗 SHARE CHANNEL', SHARE_LINK)],
                [Markup.button.url('💡 SEND FEEDBACK', 'https://t.me/afifahxrat037')]
            ])
        );

        // Hapus notifikasi sistem "X joined group"
        await ctx.deleteMessage(ctx.message.message_id).catch(() => {});
    } catch (e) { console.error("Welcome Error:", e); }
});

// --- CALLBACK QUERY: CLICK TO CHANNEL LOG ---
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const user = ctx.from;
    const userDisplay = user.username ? `@${user.username}` : user.first_name;
    const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    try {
        let actionText = "";
        let targetLink = "";
        let infoMsg = "";

        switch(data) {
            case 'btn_video': 
                infoMsg = `📹 *VIDEO UPDATE INFO*\n\nStatus: *${totalMemberSimulated} / 2000 Member*\n\nSyarat: Share link channel di bawah ini! Setiap kenaikan *300 Member*, admin upload *5 Video Baru*.\n\n🔗 ${SHARE_LINK}`;
                actionText = "Cek Update Video";
                break;
            case 'btn_download': actionText = "Download App"; targetLink = "https://t.me/c/3872252612/5"; break;
            case 'btn_install': actionText = "Install Guide"; targetLink = "https://t.me/c/3872252612/4"; break;
            case 'btn_protect': actionText = "Off Play Protect"; targetLink = "https://t.me/c/3872252612/3"; break;
        }

        // Log Aktivitas ke Channel (Tetap Berjalan!)
        const logMsg = `🔔 *ACTIVITY LOG*\n━━━━━━━━━━━━━━━━━━━━\n👤 **User:** ${userDisplay} (\`${user.id}\`)\n📝 **Aksi:** ${actionText}\n⏰ **Waktu:** ${time}\n━━━━━━━━━━━━━━━━━━━━`;
        await bot.telegram.sendMessage(CHANNEL_ID, logMsg, { parse_mode: 'Markdown' });

        await ctx.answerCbQuery(`Membuka: ${actionText}`);
        
        if (infoMsg) return ctx.reply(infoMsg, { parse_mode: 'Markdown', disable_web_page_preview: true });
        if (targetLink) return ctx.reply(`✅ *${actionText}*:\n${targetLink}`);

    } catch (e) { console.error("Callback Error:", e); }
});

// --- ADMIN STATS ---
bot.command('stats', async (ctx) => {
    if (ctx.from.id != ADMIN_ID) return;
    return ctx.reply(`📊 *BOT STATISTICS (LITE)*\nTotal Sesi Ini: *${totalMemberSimulated}*`);
});

// --- VERCEL HANDLER ---
module.exports = async (req, res) => {
    try {
        if (req.body) await bot.handleUpdate(req.body);
        res.status(200).send('OK');
    } catch (err) { 
        res.status(500).send('Bot Error'); 
    }
};
