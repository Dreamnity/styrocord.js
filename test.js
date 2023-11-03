const styro = require("./index");
const bot = new styro({
	login: {
		token: require("./token.json"),
	},
});
bot.on("messageCreate", msg =>
	console.log("<" + msg.author.username + "> " + msg.content)
);
bot.on("ready",async () => {
	console.log("Logged in!");
	console.log(await bot.users["793391165688119357"]());
});
bot.on("close", data => console.log("Connection closed: ", data));
/*bot.on("pong", () => console.log("Pong!")); //extremely annoying
bot.on("ping", () => console.log("Ping!"));*/
console.log(Object.keys(bot));