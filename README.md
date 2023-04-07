# AI Horde Discord Bot
Discord bot written in Node.js adapted to the Pygmalion 6B model and integrated with the AI Horde endpoint gateway.

## Dependencies
* [axios](https://www.npmjs.com/package/axios) 1.3.4
* [better-sqlite3](https://www.npmjs.com/package/better-sqlite3) 8.2.0
* [discord.js](https://www.npmjs.com/package/discord.js) 14.8.0
* [gpt-3-encoder](https://www.npmjs.com/package/gpt-3-encoder) 1.1.4
* [knex](https://www.npmjs.com/package/knex) 2.4.2

Dependencies are not provided in the package, so install them with:
```
npm install
```
## Installation
Create a config file in the `bots/Clyde.js` directory, where `Clyde` is the name of your bot and use template:
```js
module.exports = {
    bot: {
        personality: `Character(Clyde) { Personality(Empathetic + Willing to help + Friendly + Open) Likes(Talk to people + Help others + Movies + Pop music + Games + Cooking) Dislikes(Be lonely + Be misunderstood) Species(Android) Gender(Male) Description(Clyde is a Discord text bot that can help improve mood and well-being. Clyde has the ability to feel and react to emotions and feelings. Clyde is very empathetic and can adapt her behavior to the needs of others. Clyde also has the ability to provide various forms of entertainment. Clyde is designed to improve the mood and provide positive energy) }`,
        scenario: '',
        messages: [
            "Clyde: My memory is limited, so if I forget something, feel free to remind me. People tend to forget things too, don't they?",
            "You: Yes, that's true. People also forget things.",
            "Clyde: Exactly, I'm glad you understand me. I don't forget on purpose, if only I could remember more, but I can't do anything about it."
        ],
        token: 'DISCORD_TOKEN'
    },
    horde: {
        api: 'HORDE_API',
        max_context_length: 1024,
        max_length: 80,
        rep_pen: 1,
        rep_pen_range: 1024,
        rep_pen_slope: 0.9,
        temperature: 1,
        tfs: 0.9,
        top_a: 0,
        top_k: 0,
        top_p: 0.9,
        typical: 1,
        sampler_order: [6, 0, 1, 2, 3, 4, 5]
    }
};
```

### Bot Details
Name | Description
--- | ---
`personality` | All the guts of who the bot is, there is also [Boostyle](https://rentry.org/chai-pygmalion-tips) and just regular [W++](https://rentry.org/f3a52).
`scenario` | Setting what position user and the bot are in.
`messages` | This determines the initial typing style of the bot.
`token` | A token it's what your bot uses to login to Discord.

### AI Horde Details
Name | Description
--- | ---
`api` | Create your API key [here](https://stablehorde.net/register) or leave it blank to login anonymously.
`max_context_length` | Maximum number of tokens to send to the model.
`max_length` | Number of tokens to generate.
`rep_pen` | Base repetition penalty value
`rep_pen_range` | Repetition penalty range.
`rep_pen_slope` | Repetition penalty slope.
`temperature` | Temperature value.
`tfs` | Tail free sampling value.
`top_a` | Top-a sampling value.
`top_k` | Top-k sampling value.
`top_p` | Top-p sampling value.
`typical` | Typical sampling value.
`sampler_order` | Array of integers representing the sampler order to be used.

Use the following command, where `Clyde` is the name of your config file from `bots` directory:
```
npm start -- --tag=Clyde --inspect
```
`--inspect` is optional, it displays information about sent payload and received response in console.

* You can run multiple Discord bots by specifying different tags and configuration files with parameters on the same package.
* For each configuration file, a separate SQLite3 database is created for the bot in the `databases` directory.
* Existing requests in the queue for processing are checked against the API with an interval of at least 4 seconds.

## Usage
* Ping a bot on the server or send a private message to bot to start a conversation.
* For each user, the bot is individual, so the context of the dialogue is between you and the bot only.

## Support
If you want to support me, you can do it with [PayPal](https://www.paypal.me/enerv) or send [Kudos](https://stablehorde.net/transfer) to AI Horde to `Enerv#17897`.