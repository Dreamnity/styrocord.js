# styrocord.js
i guess the name tell how light it is, and it is also very dynamic with the discord api, since it read the api specification right from discord's repo.

Still in beta

event names is similar to discord.js

and for API, just follow discord API documentation but replace / with .

## [Official website](https://dreamnity.in/styrocord.js)

Here's a simple bot template i used for test ^-^

```js
const styro = require("styrocord.js");
const bot = new styro({
	login: {
		token: 'TOKEN',
	},
});
bot.on("messageCreate", msg =>
	console.log("<" + msg.author.username + "> " + msg.content)
);
bot.on("ready",async () => {
	console.log("Logged in!");
	bot.users["@me"]().then(console.log,console.error)
});
bot.on("close", data => console.log("Connection closed: ", data));
bot.on('error',console.error);
/*bot.on("pong", () => console.log("Pong!")); //extremely annoying
bot.on("ping", () => console.log("Ping!"));*/
```