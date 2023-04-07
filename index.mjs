import axios from 'axios';
import knex from 'knex';
import { Client, ChannelType, EmbedBuilder, Events, GatewayIntentBits, Partials } from 'discord.js';
import { encode } from 'gpt-3-encoder';

process.env.TZ = 'UTC';

const params = (() => {
    const list = {};

    process.argv.slice(2, process.argv.length).forEach((param) => {
        if(param.slice(0, 2) === '--') {
            const key = param.split('=');
            const flag = key[0].slice(2, key[0].length);
            const value = key.length > 1 ? key[1] : true;
            list[flag] = value;
        } else if (param[0] === '-') {
            const flags = param.slice(1, param.length).split('');
            flags.forEach((flag) => { list[flag] = true; });
        }
    });

    return list;
})();

const { bot, horde } = await import(`./bots/${params.tag}.js`).then(module => module?.default).catch(() => {
    console.log("The bot config file has not been loaded.\nMake sure it's in the directory and run the command with the argument.\n");
    process.exit();
});

const db = knex({
    client : 'better-sqlite3',
    connection: {
        filename: `./databases/${params.tag}.db`
    },
    useNullAsDefault: true
});

await db.migrate.latest();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages], partials: [Partials.Channel] });
const RequestType = { Processing: 0, Finished: 1, Faulted: 2 };

const fetchData = async (left = 0) => {
    const startTime = Date.now();
    const requests = await db.select('id', 'user', 'channel', 'message').from('requests').where({ status: RequestType.Processing }).catch(() => []);
    
    if (requests.length !== left) {
        if (requests.length > 0) {
            console.log(`There are ${requests.length} request(s) left to process.`);
        } else {
            console.log('There are no request to process.');
        }
    }

    for (const request of requests) {
        try {
            const { data } = await axios.get(`https://stablehorde.net/api/v2/generate/text/status/${request.id}`);

            if (data.faulted) {
                await db('requests').where({ id: request.id }).update({ status: RequestType.Faulted, editedAt: db.fn.now() });
                console.log('Fault encountered during text generation.');
                continue;
            }

            if (data.done) {
                console.log(`The request was successfully processed.`);
                await db('requests').where({ id: request.id }).update({ status: RequestType.Finished, editedAt: db.fn.now() });

                const server = {
                    user: request.user,
                    channel: request.channel,
                    message: request.message,
                    content: data.generations[0].text.replace('<|endoftext|>', '').split(new RegExp(`\\n(?:You:|${params.tag}:|END_OF_DIALOG)`))[0].trim()
                };
    
                if (params.inspect) {
                    console.log(server);
                }

                let text = server.content;
                text = text.charAt(0).toUpperCase() + text.slice(1);
    
                const channel = await client.channels.fetch(server.channel).catch(() => null);
    
                let message;
                try {
                    message = await channel.messages.fetch(server.message);
                } catch {
                    await db('messages').where({ id: server.message }).del();
                    continue;
                }
    
                let response;
                if (channel.type === ChannelType.DM) {
                    try {
                        response = await channel.send(text);
                    } catch {
                        continue;
                    }
                } else {
                    try {
                        response = await message.reply(text);
                    } catch {
                        const user = await client.users.fetch(server.user).catch(() => null);
                        if (!user) continue;
    
                        try {
                            response = await user.send(text);
                        } catch {
                            continue;
                        }
                    }
                }
    
                await db('messages').insert({ id: response.id, bot: 1, user: server.user, content: server.content });
            }
        } catch {
            await db('requests').where({ id: request.id }).update({ status: RequestType.Faulted, editedAt: db.fn.now() });
            console.log('Fault encountered during text generation.');
        }
    }

    setTimeout(fetchData, Math.max(0, 4000 - (Date.now() - startTime)), requests.length);
};

client.on(Events.MessageCreate, async (message) => {
    if (!message.content || message.author.id === client.user.id || message.content.match(/@(here|everyone)/i)) return;

    let text = message.content;
    if (text.startsWith(`<@${client.user.id}>`)) {
        text = text.replace(`<@${client.user.id}>`, '');
        text = text.replace(/^,\s*/, '');
    }

    text = text.replace(/<a?:.+?:\d+>|<:.+?:\d+>/g, '').trim();
    if (text.length < 2) return;

    text = text.charAt(0).toUpperCase() + text.slice(1);
    await db('messages').insert({ id: message.id, bot: 0, user: message.author.id, content: text });
    
    const user = await db.select('*').from('users').where({ id: message.author.id });
    if (user.length === 0) {
        await db('users').insert({ id: message.author.id });
        if (!message.author.bot) {
            message.author.send(`> Hello, <@${message.author.id}>!\n> \n> You must know that I may occasionally generate text content that is unsuitable for minors, offensive or misleading. Therefore, you must be an adult or have permission from your guardian for us to chat. Also, remember that all my content is made up and don't take it seriously.\n> \n> *This message was generated automatically, not by the AI model.*`);
        }
    }

    const messages = [];

    bot.messages.forEach((message) => {
        messages.push(message);
    });

    const items = await db.select('bot', 'content').from('messages').where({ user: message.author.id }).orderBy('createdAt', 'desc').limit(50);
    items.reverse();

    items.forEach((item, index) => {
        messages.push(`${item.bot ? params.tag : 'You'}: ${item.content}`);
        if (index === items.length - 8 && items.length >= 8) {
            messages.push(`[${bot.personality}]`);
        }
    });

    let personality = '';
    if (bot.personality) {
        personality = `${params.tag}'s Persona: [${bot.personality}]\n`;
    }

    let scenario = '';
    if (bot.scenario) {
        scenario = `Scenario: ${bot.scenario}\n`;
    }

    let prompt = personality + scenario + `<START>\n${messages.join('\n')}\n${params.tag}:`;
    while (messages.length > 0 && encode(prompt).length > horde.max_context_length) {
        messages.shift();
        prompt = personality + scenario + `<START>\n${messages.join('\n')}\n${params.tag}:`;
    }

    let payload = {
        prompt: prompt,
        params: {
            max_context_length: horde.max_context_length,
            max_length: horde.max_length,
            rep_pen: horde.rep_pen,
            rep_pen_range: horde.rep_pen_range,
            rep_pen_slope: horde.rep_pen_slope,
            temperature: horde.temperature,
            tfs: horde.tfs,
            top_a: horde.top_a,
            top_k: horde.top_k,
            top_p: horde.top_p,
            typical: horde.typical,
            sampler_order: horde.sampler_order
        },
        models: ['PygmalionAI/pygmalion-6b']
    };

    if (params.inspect) {
        console.log(payload);
    }

    try {
        const { data } = await axios.post(`https://stablehorde.net/api/v2/generate/text/async`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'apikey': horde.api || '0000000000'
            }
        });

        if (data.id) {
            await db('requests').insert({ id: data.id, user: message.author.id, channel: message.channel.id, message: message.id });
            console.log('A new request has been added for processing.');
        }
    } catch {
        console.log('The new request was not added for processing due to an error.');
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'stats') {
        const { users, messages } = await db('users').select(db.raw('COUNT(id) AS users, (SELECT COUNT(id) FROM messages WHERE bot = 1) AS messages')).first();
        const stats = new EmbedBuilder()
            .setColor([88, 101, 242])
            .setAuthor({ name: `${client.user.username}'s Statistics`, iconURL: client.user.avatarURL()})
            .setDescription(`I already sent ${messages} message(s) to ${users} user(s) on ${client.guilds.cache.size} server(s).`)
            .addFields(
                { name: 'Messages', value: `${messages}`},
                { name: 'Users', value: `${users}`},
                { name: 'Servers', value: `${client.guilds.cache.size}`})
            .setTimestamp();

        interaction.reply({ embeds: [stats], ephemeral: true })
    }
});

client.on(Events.ClientReady, async () => {
    client.application.commands.create({
        name: 'stats',
        description: 'Displays bot activity statistics',
        options: []
    });

    const { users, messages } = await db('users').select(db.raw('COUNT(id) AS users, (SELECT COUNT(id) FROM messages WHERE bot = 1) AS messages')).first();
    console.log(`${params.tag} has already sent ${messages} message(s) to ${users} user(s) on ${client.guilds.cache.size} server(s).`);

    await fetchData();
});

if (bot.token) {
    client.login(bot.token);
}