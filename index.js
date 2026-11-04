const { Client, GatewayIntentBits } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

const PREFIX = '!';

// Danh sách 10 loại nhẫn (đặt ngoài sự kiện để dùng chung cho shop và các tính năng sau)
const ringShop = {
    'dong': { name: 'Nhẫn Đồng Gỉ Sét', price: 10000, desc: 'Nhẫn hàng chợ, hơi xỉn màu.' },
    'bac': { name: 'Nhẫn Bạc Khắc Tên', price: 50000, desc: 'Bạc thật sáng bóng, khắc tên Crush.' },
    'vang': { name: 'Nhẫn Vàng Ta 24K', price: 200000, desc: 'Đậm chất dân chơi hệ mỏ vàng.' },
    'ngocbich': { name: 'Nhẫn Ngọc Bích Xanh', price: 550000, desc: 'Giúp tâm tĩnh lặng khi chơi game thua.' },
    'hacdien': { name: 'Nhẫn Hắc Diện Thạch', price: 1200000, desc: 'Đá núi lửa đen tuyền huyền bí.' },
    'longphung': { name: 'Nhẫn Long Phụng Sum Vầy', price: 3000000, desc: 'Chạm trổ rồng phượng tinh xảo.' },
    'kimcuong': { name: 'Nhẫn Kim Cương Nhân Tạo', price: 7500000, desc: 'Lấp lánh ánh hào quang chói mắt.' },
    'haclong': { name: 'Nhẫn Hắc Long Vương', price: 18000000, desc: 'Biểu tượng của kẻ thống trị server.' },
    'vocuc': { name: 'Nhẫn Vô Cực Thiên Tôn', price: 40000000, desc: 'Cổ vật truyền thuyết hiếm có.' },
    'chiton': { name: 'Nhẫn Chí Tôn Độc Bản', price: 99999999, desc: 'Đỉnh cao của sự giàu sang.' }
};

client.once('ready', () => {
    console.log(`🤖 Bot [ ${client.user.tag} ] đã sẵn sàng!`);
});

// ==========================================
// TẤT CẢ CÁC LỆNH PHẢI NẰM BÊN TRONG ĐÂY
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    // --- MỤC 1: ĐIỂM DANH (QUÁ 48 TIẾNG MỚI RESET CHUỖI) ---
    if (command === 'diemdanh') {
        const lastDaily = await db.get(`daily_${userId}`);
        let streak = (await db.get(`streak_${userId}`)) || 0;
        const now = Date.now();
        const oneDay = 86400000; // 24 giờ
        const maxDelay = oneDay * 2; // 48 giờ

        if (lastDaily !== null) {
            const timeDiff = now - lastDaily;

            if (timeDiff < oneDay) {
                const timeLeft = oneDay - timeDiff;
                const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
                return message.reply(`⏰ Chưa đến giờ điểm danh tiếp theo! Hãy quay lại sau **${hours} giờ ${minutes} phút** nữa nhé.`);
            } 
            
            if (timeDiff > maxDelay) {
                streak = 0; 
            }
        }

        streak += 1;
        const baseReward = 36000;
        const bonusReward = (streak - 1) * 1000;
        const totalReward = baseReward + bonusReward;

        const currentMoney = (await db.get(`money_${userId}`)) || 0;
        await db.set(`money_${userId}`, currentMoney + totalReward);
        await db.set(`daily_${userId}`, now);
        await db.set(`streak_${userId}`, streak);

        if (streak === 1 && lastDaily !== null) {
            return message.reply(`⚠️ Bạn đã bỏ quên hơn 48 tiếng không điểm danh nên chuỗi ngày đã bị reset!\n🎉 Điểm danh lại ngày 1, nhận **${totalReward.toLocaleString()} xu** từ chan đê.`);
        }

        return message.reply(`🔥 **${message.author.username}** điểm danh ngày thứ **${streak} liên tiếp**!\n💰 Nhận được **${totalReward.toLocaleString()} xu** (Cơ bản 36k + ${bonusReward.toLocaleString()} xu chuyên cần).`);
    }

    // --- MỤC 2: TÍNH NĂNG CHUYỂN TIỀN ---
    if (command === 'chuyentien' || command === 'pay') {
        const target = message.mentions.users.first();
        const amountStr = args[1]; 

        if (!target) {
            return message.reply('❌ Bạn phải tag người muốn chuyển tiền chứ! Ví dụ: `!chuyentien @TênNgườiNhận 50000`');
        }
        if (target.id === userId) {
            return message.reply('❌ Tự chuyển tiền cho chính mình thì có tác dụng gì đâu bạn ơi!');
        }
        if (target.bot) {
            return message.reply('❌ Không thể chuyển tiền cho bot được nha!');
        }

        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Vui lòng nhập số tiền hợp lệ cần chuyển! Ví dụ: `!chuyentien @User 50000`');
        }

        const senderBalance = (await db.get(`money_${userId}`)) || 0;
        if (senderBalance < amount) {
            return message.reply(`❌ Ví của bạn không đủ tiền! Bạn chỉ đang có **${senderBalance.toLocaleString()} xu** thôi.`);
        }

        const targetBalance = (await db.get(`money_${target.id}`)) || 0;

        await db.set(`money_${userId}`, senderBalance - amount);
        await db.set(`money_${target.id}`, targetBalance + amount);

        return message.reply(`💸 **${message.author.username}** đã chuyển thành công **${amount.toLocaleString()} xu** cho <@${target.id}>! 🎉`);
    }

    // --- MỤC 3: NGÂN HÀNG & TÍNH LÃI SUẤT ---

    // 1. Lệnh gửi tiền vào ngân hàng: !gui <số tiền> hoặc !gui all
    if (command === 'gui' || command === 'deposit') {
        const amountStr = args[0];
        const walletMoney = (await db.get(`money_${userId}`)) || 0;
        let amount;

        if (amountStr === 'all') {
            amount = walletMoney;
        } else {
            amount = parseInt(amountStr);
        }

        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Vui lòng nhập số tiền muốn gửi hợp lệ! Ví dụ: `!gui 1000` hoặc `!gui all`');
        }

        if (walletMoney < amount) {
            return message.reply(`❌ Ví của bạn không đủ tiền! Bạn chỉ có **${walletMoney.toLocaleString()} xu** trong ví thôi.`);
        }

        await updateBankInterest(userId, db);

        await db.set(`money_${userId}`, walletMoney - amount);
        const currentBank = (await db.get(`bank_${userId}`)) || 0;
        await db.set(`bank_${userId}`, currentBank + amount);

        return message.reply(`🏦 Đã gửi thành công **${amount.toLocaleString()} xu** vào ngân hàng chan đê! (Tiền gửi sẽ tự động sinh lãi 3.6%/24h).`);
    }

    // 2. Lệnh rút tiền từ ngân hàng: !rut <số tiền> hoặc !rut all
    if (command === 'rut' || command === 'withdraw') {
        const amountStr = args[0];
        
        await updateBankInterest(userId, db);
        
        const bankMoney = (await db.get(`bank_${userId}`)) || 0;
        let amount;

        if (amountStr === 'all') {
            amount = bankMoney;
        } else {
            amount = parseInt(amountStr);
        }

        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Vui lòng nhập số tiền muốn rút hợp lệ! Ví dụ: `!rut 50000` hoặc `!rut all`');
        }

        if (bankMoney < amount) {
            return message.reply(`❌ Ngân hàng của bạn không đủ tiền! Bạn chỉ đang gửi **${bankMoney.toLocaleString()} xu** thôi.`);
        }

        await db.set(`bank_${userId}`, bankMoney - amount);
        const currentWallet = (await db.get(`money_${userId}`)) || 0;
        await db.set(`money_${userId}`, currentWallet + amount);

        return message.reply(`🏧 Đã rút thành công **${amount.toLocaleString()} xu** từ ngân hàng về ví cá nhân!`);
    }

    // --- MỤC 4: HỆ THỐNG SHOP NHẪN ---

    // 1. Lệnh xem cửa hàng nhẫn: !shopnhan
    if (command === 'shopnhan') {
        let shopText = `💍 **CỬA HÀNG NHẪN CHAN ĐÊ** 💍
Cách mua: \`!muanhan <mã_nhẫn>\`

`;
        for (const [id, ring] of Object.entries(ringShop)) {
            shopText += `🔹 **Mã:** \`${id}\` | **${ring.name}** - 💰 **${ring.price.toLocaleString()} xu**\n   └ *${ring.desc}*\n\n`;
        }
        return message.reply(shopText);
    }

    // 2. Lệnh mua nhẫn: !muanhan <mã_nhẫn>
    if (command === 'muanhan') {
        const ringId = args[0]?.toLowerCase();
        if (!ringId || !ringShop[ringId]) {
            return message.reply('❌ Mã nhẫn không tồn tại! Gõ `!shopnhan` để xem danh sách mã nhẫn nhé.');
        }

        const ring = ringShop[ringId];
        const walletMoney = (await db.get(`money_${userId}`)) || 0;

        if (walletMoney < ring.price) {
            return message.reply(`❌ Ví của bạn không đủ tiền! Nhẫn **${ring.name}** có giá **${ring.price.toLocaleString()} xu**, nhưng bạn chỉ có **${walletMoney.toLocaleString()} xu** trong ví.`);
        }

        const hasRing = await db.get(`inv_${userId}_${ringId}`);
        if (hasRing) {
            return message.reply(`⚠️ Bạn đã sở hữu chiếc **${ring.name}** này trong kho đồ rồi mà!`);
        }

        await db.set(`money_${userId}`, walletMoney - ring.price);
        await db.set(`inv_${userId}_${ringId}`, true);

        return message.reply(`🎉 Chúc mừng **${message.author.username}** đã mua thành công **${ring.name}** với giá **${ring.price.toLocaleString()} xu**! Đã cất vào kho đồ.`);
    }
// --- MỤC 5: LỆNH XEM KHO ĐỒ (!kho) ---
    if (command === 'kho' || command === 'inventory') {
        let inventoryText = `🎒 **TÚI ĐỒ CỦA ${message.author.username.toUpperCase()}** 🎒\n\n`;
        let hasAnyRing = false;

        // Duyệt qua toàn bộ danh sách nhẫn trong shop để kiểm tra xem người dùng đã sở hữu chưa
        for (const [id, ring] of Object.entries(ringShop)) {
            const owned = await db.get(`inv_${userId}_${id}`);
            if (owned) {
                inventoryText += `💍 **${ring.name}** (Mã: \`${id}\`)\n   └ *${ring.desc}*\n\n`;
                hasAnyRing = true;
            }
        }

        if (!hasAnyRing) {
            inventoryText += `*(Túi đồ đang trống rỗng, chưa có chiếc nhẫn nào. Hãy ghé \`!shopnhan\` để sắm ngay nhé!)*`;
        }

        return message.reply(inventoryText);
    }
    // --- MỤC 6: HỆ THỐNG KẾT HÔN (!cauhon) ---
    if (command === 'cauhon' || command === 'marry') {
        const target = message.mentions.users.first();
        const ringId = args[1]?.toLowerCase();

        if (!target) {
            return message.reply('❌ Bạn phải tag người muốn cầu hôn chứ! Ví dụ: `!cauhon @Crush bac`');
        }
        if (target.id === userId) {
            return message.reply('❌ Tự cầu hôn chính mình thì buồn cười lắm đấy nhé!');
        }
        if (target.bot) {
            return message.reply('❌ Cầu hôn bot làm gì, bot không biết yêu đâu!');
        }
        if (!ringId || !ringShop[ringId]) {
            return message.reply('❌ Mã nhẫn không hợp lệ! Gõ `!shopnhan` để xem danh sách nhẫn và mã nhẫn nhé.');
        }

        // Kiểm tra xem người cầu hôn có thực sự sở hữu chiếc nhẫn này trong kho không
        const hasRing = await db.get(`inv_${userId}_${ringId}`);
        if (!hasRing) {
            const ringInfo = ringShop[ringId];
            return message.reply(`❌ Bạn chưa sở hữu chiếc **${ringInfo.name}** này trong túi đồ (` + '`!kho`' + `)! Hãy ra shop sắm ngay trước khi ngỏ lời nhé.`);
        }

        // Kiểm tra xem 2 người đã kết hôn chưa (tùy chọn mở rộng sau này, tạm thời bỏ qua nếu chưa làm DB kết hôn)
        const ring = ringShop[ringId];

        // Tạo 2 nút bấm: Đồng ý và Từ chối
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const acceptButtonId = `accept_marry_${userId}_${target.id}_${ringId}`;
        const declineButtonId = `decline_marry_${userId}_${target.id}_${ringId}`;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(acceptButtonId)
                .setLabel('💍 Đồng ý')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(declineButtonId)
                .setLabel('💔 Từ chối')
                .setStyle(ButtonStyle.Danger)
        );

        const proposalMessage = await message.channel.send({
            content: `💍 **LỜI CẦU HÔN THẾ KỶ!** 💍\n\n<@${target.id}> ơi! **${message.author.username}** đang quỳ gối trao tận tay bạn chiếc **${ring.name}** (${ring.desc}).\n\n⏳ Bạn có **3 phút** để suy nghĩ và đưa ra câu trả lời!`,
            components: [row]
        });

        // Tạo Collector lắng nghe nút bấm trong vòng 3 phút (180,000 ms)
        const collector = proposalMessage.createMessageComponentCollector({
            filter: i => i.user.id === target.id,
            time: 180000 
        });

        collector.on('collect', async i => {
            if (i.customId === acceptButtonId) {
                // ĐỒNG Ý KẾT HÔN -> Xóa nhẫn khỏi kho của người cầu hôn (hoặc giữ lại tùy ý bạn, ở đây mình trừ nhẫn làm sính lễ)
                await db.delete(`inv_${userId}_${ringId}`);
                await db.set(`married_${userId}`, target.id);
                await db.set(`married_${target.id}`, userId);

                await i.update({
                    content: `🎉 **CHÚC MỪNG HẠNH PHÚC!** 🎉\n\n<@${target.id}> đã **ĐỒNG Ý** lời cầu hôn của **${message.author.username}** với tín vật sính lễ là **${ring.name}**! Chúc hai bạn trăm năm hạnh phúc! 💖`,
                    components: []
                });
            } else if (i.customId === declineButtonId) {
                await i.update({
                    content: `💔 Rất tiếc... <@${target.id}> đã từ chối lời cầu hôn của **${message.author.username}**. Thôi đành ôm nhẫn đi về khóc thầm vậy... 😢`,
                    components: []
                });
            }
            collector.stop();
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                await proposalMessage.edit({
                    content: `⏳ Đã hết thời gian 3 phút suy nghĩ! Lời cầu hôn của **${message.author.username}** dành cho <@${target.id}> đã hết hiệu lực vì quá hạn.`,
                    components: []
                }).catch(() => {});
            }
        });

        return;
    }

    // --- MỤC 8: HỆ THỐNG VAY TIỀN NGƯỜI CHƠI VỚI NHAU (P2P QUA NÚT BẤM) ---

    // 1. Con nợ gửi yêu cầu vay: !vay @ChủNợ <số_tiền>
    if (command === 'vay' || command === 'borrow') {
        const targetUser = message.mentions.users.first();
        const amountStr = args[1];

        if (!targetUser) {
            return message.reply('❌ Vui lòng tag người bạn muốn vay tiền! Cú pháp: `!vay @ChủNợ <số_tiền>`');
        }

        if (targetUser.id === userId) {
            return message.reply('❌ Tự hỏi mượn tiền chính mình để làm gì thế? 😂');
        }

        if (targetUser.bot) {
            return message.reply('❌ Không thể đi vay tiền của bot được đâu!');
        }

        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Vui lòng nhập số tiền muốn vay hợp lệ! Ví dụ: `!vay @ChuNo 100000`');
        }

        // Kiểm tra xem chủ nợ có đủ tiền trong ví không trước khi gửi yêu cầu
        const lenderWallet = (await db.get(`money_${targetUser.id}`)) || 0;
        if (lenderWallet < amount) {
            return message.reply(`⚠️ <@${targetUser.id}> hiện tại chỉ có **${lenderWallet.toLocaleString()} xu** trong ví, không đủ số tiền bạn muốn vay!`);
        }

        // Tạo 2 nút bấm: Đồng ý (Green) và Từ chối (Red) sử dụng Component Builder của Discord.js
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        const acceptId = `accept_loan_${userId}_${targetUser.id}_${amount}_${Date.now()}`;
        const denyId = `deny_loan_${userId}_${targetUser.id}_${amount}_${Date.now()}`;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(acceptId).setLabel('Đồng ý cho vay').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(denyId).setLabel('Từ chối').setStyle(ButtonStyle.Danger)
        );

        const requestMsg = await message.reply({
            content: `📜 **PHIẾU YÊU CẦU VAY TIỀN**\n` +
                     `- Người mượn: <@${userId}>\n` +
                     `- Người được hỏi mượn (Chủ nợ): <targetUser>\n` + // Sửa hiển thị tag đúng
                     `- Số tiền muốn vay: **${amount.toLocaleString()} xu**\n\n` +
                     `⏳ <@${targetUser.id}>, bạn có đồng ý cho mượn không? (Hiệu lực trong 3 phút)`,
            components: [row]
        });

        // Đính chính lại hiển thị tên chủ nợ trong nội dung gửi đi cho chuẩn
        await requestMsg.edit({
            content: `📜 **PHIẾU YÊU CẦU VAY TIỀN**\n` +
                     `- Người mượn: <@${userId}>\n` +
                     `- Chủ nợ: <@${targetUser.id}>\n` +
                     `- Số tiền muốn vay: **${amount.toLocaleString()} xu**\n\n` +
                     `⏳ <@${targetUser.id}>, vui lòng bấm nút bên dưới để quyết định! (Hiệu lực trong 3 phút)`
        });

        // Tạo Collector lắng nghe sự kiện bấm nút trong 3 phút (180,000ms)
        const filter = i => i.user.id === targetUser.id && (i.customId === acceptId || i.customId === denyId);
        const collector = requestMsg.createMessageComponentCollector({ filter, time: 180000 });

        collector.on('collect', async i => {
            if (i.customId === acceptId) {
                // Kiểm tra lại tiền của chủ nợ lúc bấm nút
                const currentLenderWallet = (await db.get(`money_${targetUser.id}`)) || 0;
                if (currentLenderWallet < amount) {
                    await i.update({ content: `❌ Giao dịch thất bại! Ví của <@${targetUser.id}> không đủ tiền để giải ngân nữa.`, components: [] });
                    return;
                }

                // Thực hiện chuyển tiền: Trừ ví chủ nợ, cộng ví con nợ
                const borrowerWallet = (await db.get(`money_${userId}`)) || 0;
                await db.set(`money_${targetUser.id}`, currentLenderWallet - amount);
                await db.set(`money_${userId}`, borrowerWallet + amount);

                // Lưu khoản nợ
                const currentDebt = (await db.get(`debt_${userId}_to_${targetUser.id}`)) || 0;
                await db.set(`debt_${userId}_to_${targetUser.id}`, currentDebt + amount);

                // Cập nhật danh sách liên kết
                let lenders = (await db.get(`lenders_${userId}`)) || [];
                if (!lenders.includes(targetUser.id)) { lenders.push(targetUser.id); await db.set(`lenders_${userId}`, lenders); }

                let debtors = (await db.get(`debtors_${targetUser.id}`)) || [];
                if (!debtors.includes(userId)) { debtors.push(userId); await db.set(`debtors_${targetUser.id}`, debtors); }

                await i.update({
                    content: `✅ **GIẢI NGÂN THÀNH CÔNG!** <@${targetUser.id}> đã đồng ý cho <@${userId}> vay **${amount.toLocaleString()} xu**. 🤝`,
                    components: []
                });
            } else if (i.customId === denyId) {
                await i.update({
                    content: `❌ <@${targetUser.id}> đã **từ chối** yêu cầu vay tiền của <@${userId}>. Hết duyên! 💔`,
                    components: []
                });
            }
            collector.stop();
        });

        collector.on('end', async collected => {
            if (collected.size === 0) {
                await requestMsg.edit({
                    content: `⌛ Phiếu yêu cầu vay tiền giữa <@${userId}> và <@${targetUser.id}> đã **hết hạn** (quá 3 phút không phản hồi).`,
                    components: []
                }).catch(() => {});
            }
        });

        return;
    }

    // 2. Lệnh kiểm tra sổ nợ cá nhân: !no
    if (command === 'no' || command === 'debt') {
        let responseText = `📜 **SỔ NỢ CỦA BẠN (<@${userId}>):**\n\n`;

        const myLenders = (await db.get(`lenders_${userId}`)) || [];
        responseText += `🔴 **Các khoản bạn đang nợ:**\n`;
        if (myLenders.length === 0) {
            responseText += `  - Trộm vía, bạn không nợ ai cả! Rất uy tín. 🎉\n`;
        } else {
            for (const lenderId of myLenders) {
                const debtAmount = (await db.get(`debt_${userId}_to_${lenderId}`)) || 0;
                if (debtAmount > 0) {
                    responseText += `  - Nợ <@${lenderId}>: \`${debtAmount.toLocaleString()} xu\`\n`;
                }
            }
        }

        responseText += `\n🟢 **Những người đang nợ tiền bạn:**\n`;
        const myDebtors = (await db.get(`debtors_${userId}`)) || [];
        if (myDebtors.length === 0) {
            responseText += `  - Không có ai mượn tiền bạn cả.\n`;
        } else {
            for (const debtorId of myDebtors) {
                const creditAmount = (await db.get(`debt_${debtorId}_to_${userId}`)) || 0;
                if (creditAmount > 0) {
                    responseText += `  - <@${debtorId}> đang nợ bạn: \`${creditAmount.toLocaleString()} xu\`\n`;
                }
            }
        }

        responseText += `\n💡 *Gõ \`!trano @ChủNợ <số_tiền>\` để trả nợ nhé!*`;
        return message.reply(responseText);
    }

    // 3. Lệnh trả nợ trực tiếp: !trano @ChủNợ <số_tiền>
    if (command === 'trano' || command === 'paydebt') {
        const targetUser = message.mentions.users.first();
        const amountStr = args[1];

        if (!targetUser) {
            return message.reply('❌ Vui lòng tag chủ nợ muốn trả tiền! Cú pháp: `!trano @ChủNợ <số_tiền>`');
        }

        const lenderId = targetUser.id;
        const currentDebt = (await db.get(`debt_${userId}_to_${lenderId}`)) || 0;

        if (currentDebt <= 0) {
            return message.reply(`❌ Bạn có đang nợ <@${lenderId}> đồng nào đâu mà trả!`);
        }

        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount <= 0) {
            return message.reply(`❌ Vui lòng nhập số tiền muốn trả hợp lệ! Khoản nợ hiện tại: **${currentDebt.toLocaleString()} xu**.`);
        }

        const myWallet = (await db.get(`money_${userId}`)) || 0;
        if (myWallet < amount) {
            return message.reply(`❌ Ví của bạn không đủ tiền! Bạn đang có **${myWallet.toLocaleString()} xu**.`);
        }

        const payAmount = Math.min(amount, currentDebt);

        const lenderWallet = (await db.get(`money_${lenderId}`)) || 0;
        await db.set(`money_${userId}`, myWallet - payAmount);
        await db.set(`money_${lenderId}`, lenderWallet + payAmount);

        const remainingDebt = currentDebt - payAmount;
        await db.set(`debt_${userId}_to_` + lenderId, remainingDebt);

        if (remainingDebt === 0) {
            await db.delete(`debt_${userId}_to_${lenderId}`);

            let myLenders = (await db.get(`lenders_${userId}`)) || [];
            myLenders = myLenders.filter(id => id !== lenderId);
            await db.set(`lenders_${userId}`, myLenders);

            let lenderDebtors = (await db.get(`debtors_${lenderId}`)) || [];
            lenderDebtors = lenderDebtors.filter(id => id !== userId);
            await db.set(`debtors_${lenderId}`, lenderDebtors);
        }

        return message.reply(`🎉 Bạn đã trả thành công **${payAmount.toLocaleString()} xu** cho <@${lenderId}>! Khoản nợ còn lại: \`${remainingDebt.toLocaleString()} xu\`.`);
    }

    // --- MỤC 9: MINIGAME TÀI XỈU CÓ HIỆU ỨNG LẮC (!taixiu <Tài/Xỉu> <số_tiền>) ---
    if (command === 'taixiu' || command === 'tx') {
        const choice = args[0]?.toLowerCase();
        const amountStr = args[1];

        if (!choice || (choice !== 'tai' && choice !== 'xiu')) {
            return message.reply('❌ Cú pháp không đúng! Vui lòng dùng: `!taixiu tài <số_tiền>` hoặc `!taixiu xỉu <số_tiền>` (Tối thiểu 10,000 xu).');
        }

        const wallet = (await db.get(`money_${userId}`)) || 0;
        let betAmount;

        if (amountStr === 'all' || amountStr === 'allin') {
            betAmount = wallet;
        } else {
            betAmount = parseInt(amountStr);
        }

        if (isNaN(betAmount) || betAmount <= 0) {
            return message.reply('❌ Vui lòng nhập số tiền cược hợp lệ! Ví dụ: `!taixiu tai 50000` hoặc `!taixiu xiu all`');
        }

        const minBet = 10000;
        if (betAmount < minBet && wallet >= minBet) {
            return message.reply(`❌ Mức cược tối thiểu cho mỗi ván Tài Xỉu là **${minBet.toLocaleString()} xu** nhé!`);
        }

        if (wallet < betAmount) {
            return message.reply(`❌ Ví của bạn không đủ tiền! Bạn chỉ đang có **${wallet.toLocaleString()} xu** trong ví thôi.`);
        }

        // 1. Gửi tin nhắn hiệu ứng đang lắc ban đầu
        const rollMessage = await message.reply(`🎲 **Bát đang được xóc...**\n- Người chơi: **${message.author.username}** chọn **${choice.toUpperCase()}** (${betAmount.toLocaleString()} xu)\n- Xí ngầu đang quay: 🎲 🎲 🎲`);

        // Hàm tạo độ trễ (delay) tính bằng mili-giây
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // 2. Chạy hiệu ứng xoay xí ngầu giả lập trong khoảng 2.5 giây
        const rollingFrames = [
            '⚀ ⚂ ⚄', '⚁ ⚃ ⚅', '⚄ ⚀ ⚂', '⚅ ⚁ ⚃', '⚂ ⚄ ⚀'
        ];

        for (let i = 0; i < 3; i++) {
            await sleep(600); // Đợi 0.6 giây mỗi khung hình
            const randomFrame = rollingFrames[Math.floor(Math.random() * rollingFrames.length)];
            await rollMessage.edit(`🎲 **Sòng Tài Xỉu đang mở bát...**\n- Người chơi: **${message.author.username}** chọn **${choice.toUpperCase()}** (${betAmount.toLocaleString()} xu)\n- Xí ngầu đang quay: [ ${randomFrame} ]`);
        }

        // 3. Ra kết quả chính thức
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const dice3 = Math.floor(Math.random() * 6) + 1;
        const totalPoints = dice1 + dice2 + dice3;

        let result = '';
        if (dice1 === dice2 && dice2 === dice3) {
            result = 'bao'; 
        } else if (totalPoints >= 3 && totalPoints <= 10) {
            result = 'xiu';
        } else {
            result = 'tai';
        }

        const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        const diceDisplay = `${diceEmojis[dice1]} ${diceEmojis[dice2]} ${diceEmojis[dice3]}`;

        let finalReply = `🎲 **KẾT QUẢ TÀI XỈU** 🎲\n` +
                         `- Xí ngầu: [ ${diceDisplay} ] (Tổng điểm: **${totalPoints}**)\n`;

        if (result === 'bao') {
            await db.set(`money_${userId}`, wallet - betAmount);
            finalReply += `💥 **NỔ BÃO (${dice1}-${dice1}-${dice1})!** Nhà cái ăn hết! Bạn đã mất sạch **${betAmount.toLocaleString()} xu** cược này... 😢`;
        } else if (choice === result) {
            await db.set(`money_${userId}`, wallet + betAmount);
            const winName = result === 'tai' ? 'TÀI' : 'XỈU';
            finalReply += `🎉 Chúc mừng bạn đã chọn **${choice.toUpperCase()}** và ra kết quả **${winName}**! Bạn nhận được **+${betAmount.toLocaleString()} xu** 💰`;
        } else {
            await db.set(`money_${userId}`, wallet - betAmount);
            const winName = result === 'tai' ? 'TÀI' : 'XỈU';
            finalReply += `😢 Rất tiếc, kết quả là **${winName}**. Bạn đã thua và mất **${betAmount.toLocaleString()} xu** vào tay nhà cái...`;
        }

        // Chỉnh sửa tin nhắn ban đầu thành kết quả cuối cùng
        return rollMessage.edit(finalReply);
    }

    // --- MỤC 10: BẢNG XẾP HẠNG TOP GIÀU CÓ (!top / !rich / !leaderboard) ---
    if (command === 'top' || command === 'rich' || command === 'leaderboard') {
        // Lấy danh sách tất cả các khóa trong QuickDB để tìm dữ liệu ví và ngân hàng
        // Lưu ý: Cách tối ưu nhất với QuickDB là quét các user đã tương tác
        const allRows = await db.all();
        
        let userNetWorths = {};

        // Duyệt qua database để tính tổng tài sản (Ví + Ngân hàng) của từng user
        for (const row of allRows) {
            // Định dạng key trong DB thường là: money_<userId> hoặc bank_<userId>
            if (row.id.startsWith('money_')) {
                const uId = row.id.replace('money_', '');
                if (!userNetWorths[uId]) userNetWorths[uId] = { wallet: 0, bank: 0 };
                userNetWorths[uId].wallet = row.value || 0;
            }
            if (row.id.startsWith('bank_')) {
                const uId = row.id.replace('bank_', '');
                if (!userNetWorths[uId]) userNetWorths[uId] = { wallet: 0, bank: 0 };
                userNetWorths[uId].bank = row.value || 0;
            }
        }

        // Tính tổng tài sản (net worth) cho từng người chơi và chuyển thành mảng
        let leaderboardArray = [];
        for (const [uId, data] of Object.entries(userNetWorths)) {
            const totalWealth = data.wallet + data.bank;
            if (totalWealth > 0) {
                leaderboardArray.push({
                    userId: uId,
                    wallet: data.wallet,
                    bank: data.bank,
                    total: totalWealth
                });
            }
        }

        if (leaderboardArray.length === 0) {
            return message.reply(`🏆 **BẢNG XẾP HẠNG TÀI SẢN:** Hiện tại chưa có ai có tiền trong tài khoản cả!`);
        }

        // Sắp xếp giảm dần theo tổng tài sản (giàu nhất đứng đầu)
        leaderboardArray.sort((a, b) => b.total - a.total);

        // Lấy top 10 người giàu nhất
        const topPlayers = leaderboardArray.slice(0, 10);

        let lbText = `🏆 **BẢNG VÀNG ĐẠI GIA - TOP 10 GIÀU NHẤT SERVER** 🏆\n\n`;
        const medals = ['👑', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        let rank = 0;
        for (const player of topPlayers) {
            const medal = medals[rank] || `\`#${rank + 1}\``;
            lbText += `${medal} <@${player.userId}>\n` +
                      `   - Tổng tài sản: **${player.total.toLocaleString()} xu** (Ví: \`${player.wallet.toLocaleString()}\` | Bank: \`${player.bank.toLocaleString()}\`)\n\n`;
            rank++;
        }

        return message.reply(lbText);
    }

    // --- MỤC 11: LỆNH HƯỚNG DẪN ĐA TẦNG (!help [danh_mục]) ---
    if (command === 'help' || command === 'giup' || command === 'h') {
        const subCommand = args[0]?.toLowerCase();

        // 1. Nhóm Kinh tế & Tài chính
        if (subCommand === 'kinhte' || subCommand === 'money') {
            return message.reply(
                `💰 **HƯỚNG DẪN: KINH TẾ & TÀI CHÍNH** 💰\n` +
                `• \`!diemdanh\` - Điểm danh nhận thưởng hàng ngày (Reset nếu quá 48h).\n` +
                `• \`!profile\` (hoặc \`!me\`, \`!tt\`) - Xem hồ sơ, ví, ngân hàng, streak, nhẫn.\n` +
                `• \`!gui <số_tiền>\` - Gửi tiền tiết kiệm (Lãi suất 3.6%/24h).\n` +
                `• \`!rut <số_tiền>\` - Rút tiền tiết kiệm về ví.\n` +
                `• \`!chuyentien @User <số_tiền>\` - Chuyển xu cho người khác.\n` +
                `• \`!top\` (hoặc \`!rich\`) - Bảng xếp hạng top 10 đại gia server.`
            );
        }

        // 2. Nhóm Shop Nhẫn & Kết Hôn
        if (subCommand === 'cuoihoi' || subCommand === 'nhan' || subCommand === 'marriage') {
            return message.reply(
                `💍 **HƯỚNG DẪN: SHOP NHẪN & KẾT HÔN** 💍\n` +
                `• \`!shopnhan\` - Xem danh sách các loại nhẫn.\n` +
                `• \`!muanhan <mã_nhẫn>\` - Mua nhẫn cất vào túi đồ.\n` +
                `• \`!kho\` (hoặc \`!inventory\`) - Kiểm tra kho nhẫn đang sở hữu.\n` +
                `• \`!cauhon @User <mã_nhẫn>\` - Ngỏ lời cầu hôn (có nút tương tác & countdown 3 phút).`
            );
        }

        // 3. Nhóm Cho vay & Vay tiền P2P
        if (subCommand === 'vayno' || subCommand === 'debt') {
            return message.reply(
                `🤝 **HƯỚNG DẪN: VAY MƯỢN P2P (GIỮA NGƯỜI CHƠI VỚI NHAU)** 🤝\n` +
                `• \`!vay @ChủNợ <số_tiền>\` - Gửi phiếu mượn tiền (Chủ nợ sẽ nhận được nút [Đồng ý] / [Từ chối]).\n` +
                `• \`!no\` - Kiểm tra danh sách bạn đang nợ ai và ai đang nợ tiền bạn.\n` +
                `• \`!trano @ChủNợ <số_tiền>\` - Thanh toán trả nợ trực tiếp cho chủ nợ.`
            );
        }

        // 4. Nhóm Minigame
        if (subCommand === 'game' || subCommand === 'minigame') {
            return message.reply(
                `🎲 **HƯỚNG DẪN: KHO MINIGAME GIẢI TRÍ** 🎲\n` +
                `• \`!taixiu tài <số_tiền>\` (hoặc \`!tx xiu all\`) - Chơi Tài Xỉu cược tối thiểu 10k xu (Có hiệu ứng lắc xúc xắc).\n` +
                `*(💡 Các minigame mới sẽ sớm được cập nhật tại đây trong tương lai!)*`
            );
        }

        // Mặc định: Hiển thị Menu tổng quan khi gõ !help
        const mainHelpText = `📖 **MENU TỔNG QUAN - BOT CHAN ĐÊ** 📖\n` +
                             `Gõ các lệnh chi tiết dưới đây để xem hướng dẫn từng phân khu:\n\n` +
                             `• \`!help kinhte\` ➔ Quản lý ví, ngân hàng, điểm danh, chuyển tiền, top giàu.\n` +
                             `• \`!help cuoihoi\` ➔ Shop nhẫn, kiểm tra kho đồ, cầu hôn.\n` +
                             `• \`!help vayno\` ➔ Vay mượn tiền người chơi khác qua nút duyệt, sổ nợ, trả nợ.\n` +
                             `• \`!help game\` ➔ Các minigame cá cược (Tài Xỉu, ...).\n\n` +
                             `✨ *Con bot kinh tế chan đê đã hoàn thiện đầy đủ mọi tính năng cốt lõi!*`;

        return message.reply(mainHelpText);
    }

    // --- LỆNH WORK (1 tiếng / lần, nhận 10.000 xu) ---
if (command === 'work') {
    const userId = message.author.id;
    const cooldownTime = 60 * 60 * 1000; // 1 giờ tính bằng mili-giây
    const lastWorkTime = (await db.get(`work_time_${userId}`)) || 0;
    const now = Date.now();

    // Kiểm tra thời gian cooldown (1 tiếng)
    if (now - lastWorkTime < cooldownTime) {
        const remainingTime = cooldownTime - (now - lastWorkTime);
        const minutesLeft = Math.ceil(remainingTime / (60 * 1000));
        return message.reply(`⏱️ Bạn vừa đi làm rồi! Vui lòng đợi thêm **${minutesLeft} phút** nữa mới được làm tiếp nhé.`);
    }

    const earnAmount = 10000;
    const currentWallet = (await db.get(`money_${userId}`)) || 0;

    // Cộng tiền và lưu mốc thời gian làm việc mới
    await db.set(`money_${userId}`, currentWallet + earnAmount);
    await db.set(`work_time_${userId}`, now);

    return message.reply(`💼 Bạn đã nhận được **${earnAmount.toLocaleString()} xu**.`);
}

// --- LỆNH XEM TÀI KHOẢN / SỐ DƯ VÍ (profile / vi) ---
if (command === 'profile' || command === 'vi' || command === 'balance') {
    const userId = message.author.id;
    const currentWallet = (await db.get(`money_${userId}`)) || 0;

    return message.reply(`💰 Ví của bạn hiện đang có: **${currentWallet.toLocaleString()} xu**.`);
}



}); // <-- KẾT THÚC SỰ KIỆN MESSAGE_CREATE Ở ĐÂY


// ==========================================
// HÀM TÍNH LÃI SUẤT NGÂN HÀNG (ĐẶT Ở ĐÁY FILE)
// ==========================================
async function updateBankInterest(userId, db) {
    const bankMoney = (await db.get(`bank_${userId}`)) || 0;
    if (bankMoney <= 0) {
        await db.set(`bank_last_time_${userId}`, Date.now());
        return;
    }

    const lastTime = (await db.get(`bank_last_time_${userId}`)) || Date.now();
    const now = Date.now();
    const hoursPassed = (now - lastTime) / (1000 * 60 * 60);

    if (hoursPassed < 1) return;

    const hourlyRate = 0.036 / 24; 
    let totalInterest = 0;

    for (let i = 0; i < Math.floor(hoursPassed); i++) {
        totalInterest += bankMoney * hourlyRate;
    }

    if (totalInterest > 0) {
        const newBankMoney = Math.floor(bankMoney + totalInterest);
        await db.set(`bank_${userId}`, newBankMoney);
    }

    const remainingTime = now - (Math.floor(hoursPassed) * 3600000);
    await db.set(`bank_last_time_${userId}`, remainingTime);
}

// Đăng nhập bot (luôn ở dòng cuối cùng)
client.login(process.env.DISCORD_TOKEN);