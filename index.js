const { EventEmitter } = require("events");

const { join } = require("path"),
	{ get } = require("https"),
	{ WebSocket: ws } = require("ws"),
	APIs = {
		https: "https://discord.com/api/",
		httpheader: token => ({ Authorization: "Bot " + token }),
		spec: "https://raw.githubusercontent.com/discord/discord-api-spec/main/specs/openapi_preview.json",
	};
var apiSpec;
class Dx extends EventEmitter {
	/**
	 * Discord.js but proxy
	 * @param {Object} options Options
	 * @param {Object} options.login Login option
	 * @param {String} options.login.token Bot token
	 */
	constructor(options) {
		super("Endpoints");
		this.#validateLogin(options);
		download(join(APIs.https, "gateway")).then(result => {
			APIs.gateway = JSON.parse(result).url;
			//console.log('Logging in...');
			this.socket = new ws(APIs.gateway).on("message", r => {
				let socket = this.socket;
				let data = JSON.parse(r),
					heartbeat;
				//console.log(data);
				switch (data.op) {
					case 10:
						this.#heartbeat = data.d.heartbeat_interval;
						socket.send(
							JSON.stringify({
								op: 2,
								d: {
									properties: {
										os: process.platform,
										browser: "dx.js",
										device: process.arch,
									},
									intents: 513,
									...options.login,
								},
							})
						);
						return (heartbeat = () =>
							setTimeout(() => {
								if (this.#heartbeat == 0) return;
								if (this.#pong) {
									this.emit("ping");
									this.#pong = false;
									heartbeat(
										socket.send(JSON.stringify({ op: 1, d: this.#lastevent }))
									);
								} else {
									socket.close();
									this.emit("close", "Timed out!");
									this.#heartbeat = 0;
								}
							}, this.#heartbeat))();
					case 11:
						this.#pong = true;
						return this.emit("pong");
					case 1:
					case 0:
						this.emit(toCamelCase(data.t.replace(/_/g, " ")), data.d);
				}
				this.#lastevent = data.s || this.#lastevent;
			});
			this.socket.on("close", data => {
				if (data == 1005) return;
				this.emit("close", data);
				this.#heartbeat = 0;
			});
			this.#destroy = EventEmitter.destroy;
		});

		download(APIs.spec)
			.then(text => (apiSpec = JSON.parse(text)))
			.then(() => {
				if (!apiSpec?.openapi)
					throw new Error(
						"Error downloading the API specification: No content"
					);
				this.interact = createInteract();
				Object.keys(apiSpec.paths).forEach(e => {
					let a = e.match(/\/([a-z0-9]+).*/)[1];
					if (!(a in this)) this[a] = this.interact[a];
				});
				console.log(Object.keys(this));
			})
			.catch(e => {
				throw new Error(
					"Error downloading the API specification: " + e.message
				);
			});
	}
	#validateLogin(options) {
		if (!options?.login?.token)
			throw new ReferenceError("Token is not provided! (options.login.token)");
	}
	#heartbeat = 0;
	#lastevent = 0;
	#pong = true;
	/**
	 * @type {Proxy}
	 */
	interact;
	/**
	 * Log out the bot
	 */
	destroy() {
		try {
			this.socket.close();
			this.#destroy();
			this.#heartbeat = 0;
			return true;
		} catch {
			return false;
		}
	}
	//EventEmitter's destroy
	#destroy;
	/**
	 * @type {ws}
	 */
	socket;
}
function download(url) {
	return new Promise((r, j) =>
		get(url, function (res) {
			// Buffer the body entirely for processing as a whole.
			var bodyChunks = [];
			res
				.on("data", function (chunk) {
					// You can process streamed parts here...
					bodyChunks.push(chunk);
				})
				.on("end", function () {
					var body = Buffer.concat(bodyChunks);
					r(body);
					// ...and/or process the entire body here.
				})
				.on("error", j);
		}).on("error", j)
	);
}
/**
 * Create a proxy that interact with discord api
 * @param {String[]} path Chaining path to api
 * @param {Object} spec Discord API OpenAPI specification
 * @returns {Proxy}
 */
function createInteract(path = [], spec) {
	let pth = path.join("/");
	async function send(options) {
		let parsed = parse(pth, options);
	}
	return new Proxy(send, {
		get(t, p) {
			return createInteract(path.concat(...p.split(/[./]/)));
		},
	});
}
function toCamelCase(str) {
	return str
		.split(" ")
		.map(function (word, index) {
			// If it is the first word make sure to lowercase all the chars.
			if (index == 0) {
				return word.toLowerCase();
			}
			// If it is not the first word only upper case the first char and lowercase the rest.
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join("");
}
/**
 * a
 * @param {String[]} patharray a
 */
function parse(patharray, options) {
	let pa =
		"/" +
		patharray.map(e => (Number.isNaN(parseInt(e)) ? e : "variable")).join("/");
	console.log(pa);
	let matching = Object.keys(apiSpec.paths).find(e =>
		e.replace(/\/\{[a-z_]+\}/g, "/variable").endsWith(pa)
	);
	let data = apiSpec.paths[matching];
	console.log(matching, JSON.stringify(data));
	let result = patharray.join("/");
	return result;
}
module.exports = Dx;
