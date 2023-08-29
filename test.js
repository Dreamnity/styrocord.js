const dx = require("./index");
const bot = new dx({
	login: {
		token: require("./token.json"),
	},
});
bot.on("messageCreate", msg =>
	console.log("<" + msg.author.username + "> " + msg.content)
);
bot.on("ready", () => {
	console.log("Logged in!");
});
bot.on("close", data => console.log("Connection closed: ", data));
/*bot.on("pong", () => console.log("Pong!")); //extremely annoying
bot.on("ping", () => console.log("Ping!"));*/
console.log(Object.keys(bot));
