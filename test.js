const styro = require("./index");
const bot = new styro({
	login: {
		token: require("./token.json"), //ignored from git
	},
});
bot.on("messageCreate", msg =>
	console.log("<" + msg.author.username + "> " + msg.content)
);
bot.on("ready",async () => {
	console.log("Logged in!");
	bot.users["793391165688119357"]().then(console.log,console.error)
	console.log(await bot.channels.messages({channel_id:'876349051854028852',message_id:'1184417026853306410'}))
});
bot.on("close", data => console.log("Connection closed: ", data));
bot.on('error',console.error);
/*bot.on("pong", () => console.log("Pong!")); //extremely annoying
bot.on("ping", () => console.log("Ping!"));*/