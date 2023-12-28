<div align="center">
	<br />
	<p>
		<a href="https://dreamnity.in/styrocord.js"><img src="https://raw.githubusercontent.com/Dreamnity/styrocord.js/main/icon.png" width="200" alt="styrocord.js" /></a>
	</p>
	<br />
	<p>
		<a href="https://discord.dreamnity.in/"><img src="https://img.shields.io/discord/785358848591790121?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
		<a href="https://www.npmjs.com/package/styrocord.js"><img src="https://img.shields.io/npm/v/styrocord.js.svg?maxAge=3600" alt="npm version" /></a>
		<a href="https://www.npmjs.com/package/styrocord.js"><img src="https://img.shields.io/npm/dt/styrocord.js.svg?maxAge=3600" alt="npm downloads" /></a>
	</p>
	<p>
		<a href="https://github.com/dreamnity/styrocord.js/actions"><img src="https://github.com/dreamnity/styrocord.js/actions/workflows/npm-publish.yml/badge.svg" alt="Build status" /></a>
		<a href="https://codecov.io/gh/dreamnity/styrocord.js" ><img src="https://codecov.io/gh/dreamnity/styrocord.js/branch/main/graph/badge.svg?precision=2" alt="Code coverage" /></a>
	</p>
</div>

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
