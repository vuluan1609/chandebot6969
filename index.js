require('dotenv').config();

const mongoose = require('mongoose');
const User = require('./User'); // Khai báo model User để thao tác với database đám mây
const History = require('./History');

// Kết nối đến MongoDB Atlas qua biến môi trường trên Render
mongoose.connect("mongodb+srv://dungluanly_db_user:VuLuan.1609@chandebot.n01ywd2.mongodb.net/chandebot_db?retryWrites=true&w=majority")
.then(() => console.log('✅ Đã kết nối MongoDB Atlas thành công!'))
.catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));
const { Client, GatewayIntentBits } = require('discord.js');


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
// --- MỤC 1: ĐIỂM DANH (QUÁ 48 TIẾNG MỚI RESET CHUỖI) ---
    if (command === 'diemdanh') {
        let userData = await User.findOne({ userId });
        if (!userData) {
            userData = await User.create({ userId, balance: 0, bank: 0, streak: 0 });
        }

        const now = Date.now();
        const oneDay = 86400000; // 24 giờ
        const maxDelay = oneDay * 2; // 48 giờ

        if (userData.lastDaily !== null) {
            const timeDiff = now - userData.lastDaily;

            if (timeDiff < oneDay) {
                const timeLeft = oneDay - timeDiff;
                const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
                return message.reply(`⏰ Chưa đến giờ điểm danh tiếp theo! Hãy quay lại sau **${hours} giờ ${minutes} phút** nữa nhé.`);
            } 
            
            if (timeDiff > maxDelay) {
                userData.streak = 0; 
            }
        }

        userData.streak += 1;
        const baseReward = 36000;
        const bonusReward = (userData.streak - 1) * 1000;
        const totalReward = baseReward + bonusReward;

        userData.balance += totalReward;
        userData.lastDaily = now;
        await userData.save(); // Lưu thẳng lên MongoDB Atlas

        if (userData.streak === 1 && userData.lastDaily !== null && userData.streak === 1) {
            return message.reply(`⚠️ Bạn đã bỏ quên hơn 48 tiếng không điểm danh nên chuỗi ngày đã bị reset!\n🎉 Điểm danh lại ngày 1, nhận **${totalReward.toLocaleString()} xu** từ chan đê.`);
        }

        return message.reply(`🔥 **${message.author.username}** điểm danh ngày thứ **${userData.streak} liên tiếp**!\n💰 Nhận được **${totalReward.toLocaleString()} xu** (Cơ bản 36k + ${bonusReward.toLocaleString()} xu chuyên cần).`);
    }

    // --- MỤC 2: TÍNH NĂNG CHUYỂN TIỀN ---
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

        // Tìm người gửi trong DB
        let senderData = await User.findOne({ userId });
        if (!senderData) {
            senderData = await User.create({ userId, balance: 0 });
        }

        if (senderData.balance < amount) {
            return message.reply(`❌ Ví của bạn không đủ tiền! Bạn chỉ đang có **${senderData.balance.toLocaleString()} xu** thôi.`);
        }

        // Tìm người nhận trong DB, nếu chưa có thì tạo mới
        let targetData = await User.findOne({ userId: target.id });
        if (!targetData) {
            targetData = await User.create({ userId: target.id, balance: 0 });
        }

        // Trừ tiền người gửi và cộng tiền người nhận, sau đó lưu lại
        senderData.balance -= amount;
        targetData.balance += amount;

        await senderData.save();
        await targetData.save();

        return message.reply(`💸 **${message.author.username}** đã chuyển thành công **${amount.toLocaleString()} xu** cho <@${target.id}>! 🎉`);
    }

    // --- MỤC 3: NGÂN HÀNG & TÍNH LÃI SUẤT ---

    // 1. Lệnh gửi tiền vào ngân hàng: !gui <số tiền> hoặc !gui all
    if (command === 'gui' || command === 'deposit') {
        const amountStr = args[0];
        
        let userData = await User.findOne({ userId });
        if (!userData) {
            userData = await User.create({ userId, balance: 0, bank: 0 });
        }

        let amount;
        if (amountStr === 'all') {
            amount = userData.balance;
        } else {
            amount = parseInt(amountStr);
        }

        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Vui lòng nhập số tiền muốn gửi hợp lệ! Ví dụ: `!gui 1000` hoặc `!gui all`');
        }

        if (userData.balance < amount) {
            return message.reply(`❌ Ví của bạn không đủ tiền! Bạn chỉ có **${userData.balance.toLocaleString()} xu** trong ví thôi.`);
        }

        userData.balance -= amount;
        userData.bank += amount;
        await userData.save();

        return message.reply(`🏦 Đã gửi thành công **${amount.toLocaleString()} xu** vào ngân hàng chan đê!`);
    }

    // 2. Lệnh rút tiền từ ngân hàng: !rut <số tiền> hoặc !rut all
    if (command === 'rut' || command === 'withdraw') {
        const amountStr = args[0];
        
        let userData = await User.findOne({ userId });
        if (!userData) {
            userData = await User.create({ userId, balance: 0, bank: 0 });
        }

        let amount;
        if (amountStr === 'all') {
            amount = userData.bank;
        } else {
            amount = parseInt(amountStr);
        }

        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Vui lòng nhập số tiền muốn rút hợp lệ! Ví dụ: `!rut 50000` hoặc `!rut all`');
        }

        if (userData.bank < amount) {
            return message.reply(`❌ Ngân hàng của bạn không đủ tiền! Bạn chỉ đang gửi **${userData.bank.toLocaleString()} xu** thôi.`);
        }

        userData.bank -= amount;
        userData.balance += amount;
        await userData.save();

        return message.reply(`🏧 Đã rút thành công **${amount.toLocaleString()} xu** từ ngân hàng về ví cá nhân!`);
    }


    // --- MỤC 4: HỆ THỐNG SHOP NHẪN ---

    // 1. Lệnh xem cửa hàng nhẫn: !shopnhan
    if (command === 'shopnhan') {
        let shopText = `💍 **CỬA HÀNG NHẪN CHAN ĐÊ** 💍\nCách mua: \`!muanhan <mã_nhẫn>\`\n\n`;
        for (const [id, ring] of Object.entries(ringShop)) {
            shopText += `🔹 **Mã:** \`${id}\` | **${ring.name}** - 💰 **${ring.price.toLocaleString()} xu**\n  └ *${ring.desc}*\n\n`;
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

        let userData = await User.findOne({ userId });
        if (!userData) {
            userData = await User.create({ userId, balance: 0, inventory: [] });
        }

        if (userData.balance < ring.price) {
            return message.reply(`❌ Ví của bạn không đủ tiền! Nhẫn **${ring.name}** có giá **${ring.price.toLocaleString()} xu**, nhưng bạn chỉ có **${userData.balance.toLocaleString()} xu** trong ví.`);
        }

        // Kiểm tra xem trong mảng inventory đã có mã nhẫn này chưa
        if (userData.inventory.includes(ringId)) {
            return message.reply(`⚠️ Bạn đã sở hữu chiếc **${ring.name}** này trong kho đồ rồi mà!`);
        }

        userData.balance -= ring.price;
        userData.inventory.push(ringId);
        await userData.save();

        return message.reply(`🎉 Chúc mừng **${message.author.username}** đã mua thành công **${ring.name}** với giá **${ring.price.toLocaleString()} xu**! Đã cất vào kho đồ.`);
    }

    // --- MỤC 5: LỆNH XEM KHO ĐỒ (!kho) ---
    if (command === 'kho' || command === 'inventory') {
        let userData = await User.findOne({ userId });
        if (!userData) {
            userData = await User.create({ userId, inventory: [] });
        }

        let inventoryText = `🎒 **TÚI ĐỒ CỦA ${message.author.username.toUpperCase()}** 🎒\n\n`;

        if (!userData.inventory || userData.inventory.length === 0) {
            inventoryText += `*(Túi đồ đang trống rỗng, chưa có chiếc nhẫn nào. Hãy ghé \`!shopnhan\` để sắm ngay nhé!)*`;
        } else {
            for (const ringId of userData.inventory) {
                const ring = ringShop[ringId];
                if (ring) {
                    inventoryText += `💍 **${ring.name}** (Mã: \`${ringId}\`)\n  └ *${ring.desc}*\n\n`;
                }
            }
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

        // Lấy thông tin user từ MongoDB
        let userData = await User.findOne({ userId });
        if (!userData) {
            userData = await User.create({ userId, inventory: [] });
        }

        // Kiểm tra xem người cầu hôn có sở hữu chiếc nhẫn này trong kho không
        if (!userData.inventory || !userData.inventory.includes(ringId)) {
            const ringInfo = ringShop[ringId];
            return message.reply(`❌ Bạn chưa sở hữu chiếc **${ringInfo.name}** này trong túi đồ (` + '`!kho`' + `)! Hãy ra shop sắm ngay trước khi ngỏ lời nhé.`);
        }

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
                // ĐỒNG Ý KẾT HÔN -> Xóa nhẫn khỏi kho người cầu hôn và cập nhật trạng thái kết hôn cho cả 2
                let senderData = await User.findOne({ userId });
                if (senderData && senderData.inventory) {
                    senderData.inventory = senderData.inventory.filter(r => r !== ringId);
                    senderData.marriedTo = target.id;
                    await senderData.save();
                }

                let targetData = await User.findOne({ userId: target.id });
                if (!targetData) {
                    targetData = await User.create({ userId: target.id });
                }
                targetData.marriedTo = userId;
                await targetData.save();

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

        // Lấy thông tin ví của chủ nợ
        let lenderData = await User.findOne({ userId: targetUser.id });
        const lenderWallet = lenderData ? lenderData.balance : 0;

        if (lenderWallet < amount) {
            return message.reply(`⚠️ <@${targetUser.id}> hiện tại chỉ có **${lenderWallet.toLocaleString()} xu** trong ví, không đủ số tiền bạn muốn vay!`);
        }

        // Tạo 2 nút bấm: Đồng ý và Từ chối
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
                     `- Chủ nợ: <@${targetUser.id}>\n` +
                     `- Số tiền muốn vay: **${amount.toLocaleString()} xu**\n\n` +
                     `⏳ <@${targetUser.id}>, vui lòng bấm nút bên dưới để quyết định! (Hiệu lực trong 3 phút)`,
            components: [row]
        });

        const filter = i => i.user.id === targetUser.id && (i.customId === acceptId || i.customId === denyId);
        const collector = requestMsg.createMessageComponentCollector({ filter, time: 180000 });

        collector.on('collect', async i => {
            if (i.customId === acceptId) {
                // Kiểm tra lại tiền của chủ nợ lúc bấm nút
                let currentLender = await User.findOne({ userId: targetUser.id });
                if (!currentLender || currentLender.balance < amount) {
                    await i.update({ content: `❌ Giao dịch thất bại! Ví của <@${targetUser.id}> không đủ tiền để giải ngân nữa.`, components: [] });
                    return;
                }

                // Lấy thông tin con nợ
                let borrower = await User.findOne({ userId });
                if (!borrower) {
                    borrower = await User.create({ userId, balance: 0 });
                }

                // Trừ tiền chủ nợ, cộng tiền con nợ
                currentLender.balance -= amount;
                borrower.balance += amount;

                // Cập nhật sổ nợ (thêm hoặc cộng dồn khoản nợ của borrower với lender)
                let debtRecord = borrower.debts.find(d => d.lenderId === targetUser.id);
                if (debtRecord) {
                    debtRecord.amount += amount;
                } else {
                    borrower.debts.push({ lenderId: targetUser.id, borrowerId: userId, amount: amount });
                }

                await currentLender.save();
                await borrower.save();

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
        let userData = await User.findOne({ userId });
        if (!userData) {
            userData = await User.create({ userId });
        }

        let responseText = `📜 **SỔ NỢ CỦA BẠN (<@${userId}>):**\n\n`;

        responseText += `🔴 **Các khoản bạn đang nợ:**\n`;
        if (!userData.debts || userData.debts.length === 0) {
            responseText += `  - Trộm vía, bạn không nợ ai cả! Rất uy tín. 🎉\n`;
        } else {
            for (const d of userData.debts) {
                responseText += `  - Nợ <@${d.lenderId}>: \`${d.amount.toLocaleString()} xu\`\n`;
            }
        }

        // Tìm những người đang nợ mình
        const debtors = await User.find({ "debts.lenderId": userId });
        responseText += `\n🟢 **Những người đang nợ tiền bạn:**\n`;
        if (debtors.length === 0) {
            responseText += `  - Không có ai mượn tiền bạn cả.\n`;
        } else {
            for (const debtor of debtors) {
                const debtItem = debtor.debts.find(d => d.lenderId === userId);
                if (debtItem && debtItem.amount > 0) {
                    responseText += `  - <@${debtor.userId}> đang nợ bạn: \`${debtItem.amount.toLocaleString()} xu\`\n`;
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

        let borrower = await User.findOne({ userId });
        if (!borrower) {
            borrower = await User.create({ userId });
        }

        let debtRecord = borrower.debts.find(d => d.lenderId === lenderId);
        const currentDebt = debtRecord ? debtRecord.amount : 0;

        if (currentDebt <= 0) {
            return message.reply(`❌ Bạn có đang nợ <@${lenderId}> đồng nào đâu mà trả!`);
        }

        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount <= 0) {
            return message.reply(`❌ Vui lòng nhập số tiền muốn trả hợp lệ! Khoản nợ hiện tại: **${currentDebt.toLocaleString()} xu**.`);
        }

        if (borrower.balance < amount) {
            return message.reply(`❌ Ví của bạn không đủ tiền! Bạn đang có **${borrower.balance.toLocaleString()} xu**.`);
        }

        const payAmount = Math.min(amount, currentDebt);

        let lender = await User.findOne({ userId: lenderId });
        if (!lender) {
            lender = await User.create({ userId: lenderId });
        }

        // Trừ ví con nợ, cộng ví chủ nợ
        borrower.balance -= payAmount;
        lender.balance += payAmount;

        // Cập nhật lại số tiền nợ
        debtRecord.amount -= payAmount;

        // Nếu đã trả sạch nợ thì xóa khỏi mảng debts
        if (debtRecord.amount <= 0) {
            borrower.debts = borrower.debts.filter(d => d.lenderId !== lenderId);
        }

        await borrower.save();
        await lender.save();

        const remainingDebt = debtRecord.amount > 0 ? debtRecord.amount : 0;
        return message.reply(`🎉 Bạn đã trả thành công **${payAmount.toLocaleString()} xu** cho <@${lenderId}>! Khoản nợ còn lại: \`${remainingDebt.toLocaleString()} xu\`.`);
    }

   // --- MỤC 9: MINIGAME TÀI XỈU CÓ HIỆU ỨNG LẮC & LƯU LỊCH SỬ (!taixiu <Tài/Xỉu> <số_tiền>) ---
if (command === 'taixiu' || command === 'tx') {
    const choice = args[0]?.toLowerCase();
    const amountStr = args[1];

    if (!choice || (choice !== 'tai' && choice !== 'xiu')) {
        return message.reply('❌ Cú pháp không đúng! Vui lòng dùng: `!taixiu tai <số_tiền>` hoặc `!taixiu xiu <số_tiền>` (Tối thiểu 10,000 xu).');
    }

    let userData = await User.findOne({ userId });
    if (!userData) {
        userData = await User.create({ userId, balance: 0 });
    }

    const wallet = userData.balance;
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
    const rollMessage = await message.reply(`🎲 **Bát đang được xóc...**\nNgười chơi: **${message.author.username}** chọn **${choice.toUpperCase()}** (${betAmount.toLocaleString()} xu)\nXí ngầu đang quay: 🎲 🎲 🎲`);

    // Hàm tạo độ trễ (delay) tính bằng mili-giây
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // 2. Chạy hiệu ứng xoay xí ngầu giả lập trong khoảng 3 giây
    const rollingFrames = [
        '⚀ ⚂ ⚄', '⚁ ⚃ ⚅', '⚄ ⚀ ⚂', '⚅ ⚁ ⚃', '⚂ ⚄ ⚀'
    ];

    for (let i = 0; i < 5; i++) {
        await sleep(600); // Đợi 0.6 giây mỗi khung hình
        const randomFrame = rollingFrames[Math.floor(Math.random() * rollingFrames.length)];
        await rollMessage.edit(`🎲 **Sòng Tài Xỉu đang mở bát...**\nNgười chơi: **${message.author.username}** chọn **${choice.toUpperCase()}** (${betAmount.toLocaleString()} xu)\nXí ngầu đang quay: [ ${randomFrame} ]`);
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

    // Cập nhật lại số dư vào MongoDB tùy theo thắng/thua
    userData = await User.findOne({ userId });

    if (result === 'bao') {
        userData.balance -= betAmount;
        finalReply += `💥 **NỔ BÃO (${dice1}-${dice1}-${dice1})!** Nhà cái ăn hết! Bạn đã mất sạch **${betAmount.toLocaleString()} xu** cược này... 😢`;
    } else if (choice === result) {
        userData.balance += betAmount;
        const winName = result === 'tai' ? 'TÀI' : 'XỈU';
        finalReply += `🎉 Chúc mừng bạn đã chọn **${choice.toUpperCase()}** và ra kết quả **${winName}**! Bạn nhận được **+${betAmount.toLocaleString()} xu** 💰`;
    } else {
        userData.balance -= betAmount;
        const winName = result === 'tai' ? 'TÀI' : 'XỈU';
        finalReply += `😢 Rất tiếc, kết quả là **${winName}**. Bạn đã thua và mất **${betAmount.toLocaleString()} xu** vào tay nhà cái...`;
    }

    await userData.save();

    // 4. LƯU KẾT QUẢ VÀO HISTORY ĐỂ PHỤC VỤ LỆNH !soicau
    let history = await History.findOne({ serverKey: 'global' });
    if (!history) {
        history = new History({ serverKey: 'global', results: [] });
    }

    let recordResult = result;
    if (result === 'bao') {
        recordResult = 'xiu'; // Nếu bão thì quy đổi tạm sang xỉu để ghi nhận cầu
    }

    history.results.push(recordResult);
    if (history.results.length > 20) {
        history.results.shift(); 
    }
    await history.save();

    // Chỉnh sửa tin nhắn ban đầu thành kết quả cuối cùng
    return rollMessage.edit(finalReply);
}

// --- MỤC 10: LỆNH SOI CẦU ĐẶC BIỆT (!soicau) ---
if (command === 'soicau') {
    let history = await History.findOne({ serverKey: 'global' });
    if (!history || history.results.length === 0) {
        return message.reply('📊 Chưa có dữ liệu lịch sử tài xỉu nào! Hãy chơi vài ván `!taixiu` trước nhé.');
    }

    const recentResults = history.results.slice(-10);
    const visualResults = recentResults.map(r => r === 'tai' ? '🔴' : '🔵').join(' ');
    const taiCount = recentResults.filter(r => r === 'tai').length;
    const xiuCount = recentResults.filter(r => r === 'xiu').length;

    return message.reply(
        `📊 **BẢNG SOI CẦU TÀI XỈU (${recentResults.length} ván gần nhất)** 📊\n` +
        `├ Chuỗi cầu: ${visualResults}\n` +
        `├ Thống kê: 🔴 **Tài**: ${taiCount} | 🔵 **Xỉu**: ${xiuCount}\n` +
        `└ 💡 *Xu hướng:* Cầu đang nghiêng về **${taiCount >= xiuCount ? 'TÀI 🔴' : 'XỈU 🔵'}**!`
    );
}

    // --- MỤC 10: BẢNG XẾP HẠNG TOP GIÀU CÓ (!top / !rich / !leaderboard) ---
    if (command === 'top' || command === 'rich' || command === 'leaderboard') {
        // Lấy toàn bộ danh sách user từ MongoDB, sắp xếp theo tổng (balance + bank) giảm dần và lấy top 10
        const users = await User.find({});

        if (!users || users.length === 0) {
            return message.reply(`🏆 **BẢNG XẾP HẠNG TÀI SẢN:** Hiện tại chưa có dữ liệu người dùng nào trong hệ thống!`);
        }

        let leaderboardArray = users.map(u => {
            const wallet = u.balance || 0;
            const bank = u.bank || 0;
            return {
                userId: u.userId,
                wallet: wallet,
                bank: bank,
                total: wallet + bank
            };
        });

        // Lọc bỏ những ai có tổng tài sản bằng 0 (nếu muốn) hoặc giữ lại tất cả
        leaderboardArray = leaderboardArray.filter(p => p.total > 0);

        if (leaderboardArray.length === 0) {
            return message.reply(`🏆 **BẢNG XẾP HẠNG TÀI SẢN:** Hiện tại chưa có ai có tiền trong tài khoản cả!`);
        }

        // Sắp xếp giảm dần theo tổng tài sản
        leaderboardArray.sort((a, b) => b.total - a.total);

        // Lấy top 10 người giàu nhất
        const topPlayers = leaderboardArray.slice(0, 10);

        let lbText = `🏆 **BẢNG VÀNG ĐẠI GIA - TOP 10 GIÀU NHẤT SERVER** 🏆\n\n`;
        const medals = ['👑', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        let rank = 0;
        for (const player of topPlayers) {
            const medal = medals[rank] || `\`#${rank + 1}\``;
            lbText += `${medal} <@${player.userId}>\n` +
                      `  - Tổng tài sản: **${player.total.toLocaleString()} xu** (Ví: \`${player.wallet.toLocaleString()}\` | Bank: \`${player.bank.toLocaleString()}\`)\n\n`;
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
                `• \`!gui <số_tiền>\` - Gửi tiền tiết kiệm vào ngân hàng.\n` +
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
                `🤝 **HƯỚNG DẪN: VAY MƯỢN P2P** 🤝\n` +
                `• \`!vay @ChủNợ <số_tiền>\` - Gửi phiếu yêu cầu vay tiền (chủ nợ bấm nút đồng ý).\n` +
                `• \`!no\` (hoặc \`!debt\`) - Kiểm tra sổ nợ cá nhân (ai đang nợ mình, mình đang nợ ai).\n` +
                `• \`!trano @ChủNợ <số_tiền>\` - Trả nợ trực tiếp cho chủ nợ.`
            );
        }

        // 4. Nhóm Minigame
        if (subCommand === 'game' || subCommand === 'taixiu') {
            return message.reply(
                `🎲 **HƯỚNG DẪN: MINIGAME TÀI XỈU** 🎲\n` +
                `• \`!taixiu tai <số_tiền>\` (hoặc \`!tx tai <số_tiền>\`) - Cược cửa Tài (hoặc gõ \`all\` / \`allin\`).\n` +
                `• \`!taixiu xiu <số_tiền>\` - Cược cửa Xỉu (Tối thiểu 10,000 xu).`
            );
        }

        // Giao diện Help tổng quan nếu không nhập danh mục
        return message.reply(
            `📖 **HỆ THỐNG TRỢ GIÚP BOT CHAN ĐÊ** 📖\n` +
            `Gõ \`!help <danh_mục>\` để xem chi tiết từng nhóm lệnh:\n\n` +
            `🔹 \`!help kinhte\` - Kinh tế, điểm danh, ví, ngân hàng, chuyển tiền, top.\n` +
            `🔹 \`!help cuoihoi\` - Shop nhẫn, túi đồ, kết hôn.\n` +
            `🔹 \`!help vayno\` - Vay mượn tiền P2P giữa các người chơi.\n` +
            `🔹 \`!help game\` - Minigame Tài Xỉu xí ngầu.`
        );
    }



   // --- MỤC: LỆNH KIẾM TIỀN / LÀM VIỆC (!work) ---
    if (command === 'work') {
    let user = await User.findOne({ userId: message.author.id });
    if (!user) {
        user = new User({ userId: message.author.id, balance: 0, lastWork: 0 });
    }

    const cooldownTime = 60 * 60 * 1000; // 1 giờ (tính bằng mili-giây)
    const timeLeft = cooldownTime - (Date.now() - user.lastWork);

    if (timeLeft > 0) {
        const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
        return message.reply(`⏳ Bạn vừa đi làm rồi! Vui lòng đợi thêm **${minutesLeft} phút** nữa mới được đi làm tiếp nhé.`);
    }

    // Cộng cố định 50,000 xu sau khi hết thời gian chờ
    const earnings = 50000;
    user.balance += earnings;
    user.lastWork = Date.now();
    await user.save();

    return message.reply(`🛠️ Bạn đã đi làm chăm chỉ và kiếm được **${earnings.toLocaleString()} xu**! Tổng số dư ví hiện tại: **${user.balance.toLocaleString()} xu**.`);
}

// --- LỆNH XEM HỒ SƠ CÁ NHÂN (!me / !profile) ---
    if (command === 'me' || command === 'profile' || command === 'tt') {
        let userData = await User.findOne({ userId });
        if (!userData) {
            userData = await User.create({ userId, balance: 0, bank: 0, streak: 0, inventory: [] });
        }

        const wallet = userData.balance || 0;
        const bank = userData.bank || 0;
        const total = wallet + bank;
        
        let marriageStatus = 'Độc thân vui vẻ 🍃';
        if (userData.marriedTo) {
            marriageStatus = `Đã kết hôn với <@${userData.marriedTo}> 💍`;
        }

        return message.reply(
            `📊 **HỒ SƠ CÁ NHÂN CỦA ${message.author.username.toUpperCase()}**\n\n` +
            `💰 Ví: \`${wallet.toLocaleString()} xu\`\n` +
            `🏦 Ngân hàng: \`${bank.toLocaleString()} xu\`\n` +
            `💎 Tổng tài sản: **${total.toLocaleString()} xu**\n` +
            `💍 Tình trạng: ${marriageStatus}`
        );
    }

    // --- LỆNH XEM NHANH SỐ DƯ VÍ (!vi) ---
    if (command === 'vi' || command === 'wallet') {
        let userData = await User.findOne({ userId });
        if (!userData) {
            userData = await User.create({ userId, balance: 0 });
        }

        const wallet = userData.balance || 0;
        return message.reply(`💰 Ví của bạn hiện đang có: **${wallet.toLocaleString()} xu**.`);
    }

    // --- LỆNH XEM NHANH SỐ DƯ NGÂN HÀNG (!bank) ---
    if (command === 'bank' || command === 'nganhang') {
        let userData = await User.findOne({ userId });
        if (!userData) {
            userData = await User.create({ userId, bank: 0 });
        }

        const bank = userData.bank || 0;
        return message.reply(`🏦 Ngân hàng của bạn hiện đang gửi: **${bank.toLocaleString()} xu**.`);
    }


}); // <-- KẾT THÚC SỰ KIỆN MESSAGE_CREATE Ở ĐÂY


// ==========================================
// --- HÀM TÍNH LÃI SUẤT NGÂN HÀNG TỰ ĐỘNG CHO TẤT CẢ USER ---
async function updateBankInterest() {
    try {
        const users = await User.find({ bank: { $gt: 0 } }); // Chỉ lấy những user có tiền trong ngân hàng
        const now = Date.now();

        for (let user of users) {
            // Nếu chưa có mốc thời gian tính lãi (lastInterestTime), gán bằng thời điểm hiện tại
            if (!user.lastInterestTime) {
                user.lastInterestTime = now;
                await user.save();
                continue;
            }

            const hoursPassed = (now - user.lastInterestTime) / (1000 * 60 * 60);

            // Cứ qua 1 tiếng thì tính lãi một lần
            if (hoursPassed >= 1) {
                const hoursToCalculate = Math.floor(hoursPassed);
                const hourlyRate = 0.036 / 24; // Lãi suất ví dụ (có thể điều chỉnh tùy ý)
                
                let totalInterest = 0;
                for (let i = 0; i < hoursToCalculate; i++) {
                    totalInterest += user.bank * hourlyRate;
                }

                if (totalInterest > 0) {
                    user.bank = Math.floor(user.bank + totalInterest);
                }

                // Cập nhật lại mốc thời gian tính lãi (giữ lại phần dư thời gian chưa đủ tiếng)
                user.lastInterestTime = now - ((hoursPassed - hoursToCalculate) * 1000 * 60 * 60);
                await user.save();
            }
        }
    } catch (error) {
        console.error('❌ Lỗi khi tính lãi suất ngân hàng:', error);
    }
}

// Gọi hàm định kỳ (Ví dụ: Cứ mỗi 1 tiếng chạy tính lãi 1 lần)
setInterval(updateBankInterest, 60 * 60 * 1000);




// Đăng nhập bot (luôn ở dòng cuối cùng)
client.login(process.env.DISCORD_TOKEN);