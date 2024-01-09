import { Telegraf, Context } from 'telegraf';
import notionConnector from '../notion/connector';
import env from '../../env';
import debug from 'debug';

const ll = debug('notionbot::telegramConnector');
const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

function isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

interface Record {
    [key: string]: string;
}

const Users: Record = {};

export default {
    run: function () {
        bot.start((ctx) => ctx.reply('Добро пожаловать в бот для задач. Пишите свою задачу!\n==============\nСтруктура должна быть такой:\nНазвание задачи\nСтатус\nКлиент\nДата (Формат: 2023-01-28)\n==============\nЕсли вы не помните название статуса или клиента - пропишите команду /list\nВаш Telegram id - ' + ctx.from.id));
        bot.hears('/list', async ctx => {
            let list = "<b>Статусы:</b>\n1. Не начато\n2. В процессе\n3. Холд\n4. Готово\n5. Архив\n\n==============\n\n<b>Клиенты:</b>\n";
            const clients = JSON.parse(JSON.stringify(await notionConnector.getClients('')))['results'];
            // let cls = clients['results'].hasOwnProperty(0)?clients['results']:0;
            for (const client of clients) {
                list += "- "+client['properties']['Клиент']['title'][0]['text']['content']+"\n";
            }
            await ctx.reply(list, {
                parse_mode: "HTML"
            });
        });
        bot.on('message', async function (ctx: Context) {
            ll('newMessage from ' + ctx.message?.from.id);
            
            if (!(ctx.message && 'text' in ctx.message)) {
                await ctx.reply('Сообщение может быть только текстовым!');
                return;
            }
            if (
                !ctx.message.from.username
            ) {
                ll('empty username');
                return;
            }
            let sendData = [];
            sendData = ctx.message.text.split("\n");
            if (sendData.length!=4) {
                await ctx.reply('Указаны не все параметры!');
                return;
            } else if (!Users[ctx.message.from.id]) {
                await ctx.reply('У вас нет доступа!');
                return;
            } else {

                const clients = JSON.parse(JSON.stringify(await notionConnector.getClients(sendData[2])));
                let clientId = clients['results'].hasOwnProperty(0)?clients['results'][0]['id']:0;

                if (!isValidDate(sendData[3])) {
                    await ctx.reply('Дата не указана или указана в неправильном формате. Подробнее в /start');
                    return;
                }

                if (!clientId) {
                    await ctx.reply('Задача создана без клиента, если вы забыли название клиента, пропишите /list');
                }

                let status: string = sendData[1];
                status = status.trim();
                
                if (status!='Не начато'&&status!='В процессе'&&status!='Холд'&&status!='Готово'&&status!='Архив') {
                    await ctx.reply('Задача создана со статусом "Не начато", если вы забыли название статусов, пропишите /list');
                    status = 'Не начато';
                }

                const createTaskResult = await notionConnector.createTask(sendData[0], status, clientId, sendData[3], Users[ctx.message.from.id], ctx.message.from.id);
                const createdTaskMessage = 'Новая задача - [' + sendData[0] + '](https://www.notion.so/' + notionConnector.convertTaskToUrl(createTaskResult) + ')';
                await ctx.reply(createdTaskMessage, {
                    parse_mode: "Markdown"
                });
                ll(createdTaskMessage);
            }
                
        });

        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));

        return bot.launch().then(() => {
            ll('bot started');
        });
    }
};
