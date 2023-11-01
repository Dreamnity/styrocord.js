const { EventEmitter } = require('events');

const { join } = require('path'),
	{ get, request } = require('https'),
	{ WebSocket: ws } = require('ws'),
	{ version } = require('./package.json'),
	APIs = {
		https: 'https://discord.com/api/',
		httpheader: token => ({
			Authorization: 'Bot ' + token,
			'User-Agent':
				'DiscordBot (https://github.com/Dreamnity/styrofoam.js, ' +
				version +
				')',
		}),
		spec: 'https://raw.githubusercontent.com/discord/discord-api-spec/main/specs/openapi_preview.json',
	};
var apiSpec;
class Styrofoam extends EventEmitter {
	/**
	 * Discord.js but proxy
	 * @param {Object} options Options
	 * @param {Object} options.login Login option
	 * @param {String} options.login.token Bot token
	 */
	constructor(options) {
		super('Endpoints');
		this.options = options
		this.#validateLogin(options);
		const outerThis = this;
		download(APIs.spec)
			.then(text => (apiSpec = JSON.parse(text)))
			.then(() => {
				if (!apiSpec?.openapi)
					throw new Error(
						'Error downloading the API specification: No content'
					);
				outerThis.interact = outerThis.createInteract();
				Object.keys(apiSpec.paths).forEach(e => {
					let a = e.match(/\/([a-z0-9]+).*/)[1];
					if (!(a in this)) this[a] = this.interact[a];
				});
			})
			.catch(e => {
				throw new Error(
					'Error downloading the API specification: ' + e.message
				);
			});
		download(join(APIs.https, 'gateway')).then(result => {
			APIs.gateway = JSON.parse(result).url;
			this.login();
		});
	}
	#validateLogin(options) {
		if (!options?.login?.token)
			throw new ReferenceError('Token is not provided! (options.login.token)');
		this.#token = options.login.token;
	}
	session = {};
	#token = '';
	#heartbeat = 0;
	#pingtime = 0;
	ping = 0;
	#lastevent = 0;
	#pong = true;
	/**
	 * @type {Proxy}
	 */
	interact;
	/**
	 * Create a proxy that interact with discord api
	 * @param {String[]} path Chaining path to api
	 * @param {Object} spec Discord API OpenAPI specification
	 * @returns {Proxy}
	 */
	createInteract(path = []) {
		let pth = path.join('/');
		let token = this.#token;
		function send(options) {
			let parsed = parse(pth, options);
			if (!parsed)
				throw new Error(
					"Endpoint not found (trying to search for " + pth.join("/") + ")"
				);
			return new Promise(function (resolve, reject) {
				request(
					new URL(pth, APIs.https),
					{
						headers: APIs.httpheader(token),
						method: "POST",
					},
					res => {
						var chunks = '';
						res.on('data', e => chunks += e)
						res.on('end', () => {
							const data = JSON.parse(chunks);
							if (!res.statusCode.toString().startsWith('2')&&data.message) {
								const err = new Error(data.message);
								err.name = 'DiscordAPIError';
								err.code = data.code;
								
								reject(err);
							}
						})
					}
				);
			});
		}
		/*async function send(options) {
			let parsed = parse(pth, options);
			if (!parsed)
				throw new Error(
					'Endpoint not found (trying to search for ' + pth + ')'
				);
			request(
				new URL(pth, APIs.https),
				{
					headers: APIs.httpheader(token),
					method: 'POST',
				},
				res => {}
			);
		}*/
		return new Proxy(send, {
			get(t, p) {
				return this.createInteract(path.concat(...p.split(/[./]/)));
			},
		});
	}
	options = {};
	/**
	 * Login to the bot
	 * @param {Object} option Login option
	 */
	login(config) {
		const { gateway,customLogin } = config||{};
		if(this.socket) this.socket.close();
		this.socket = new ws(gateway || APIs.gateway).on('message', r => {
			let socket = this.socket;
			let data = JSON.parse(r),
				heartbeat;
			//console.log(data);
			switch (data.op) {
				case 10:
					this.#heartbeat = data.d.heartbeat_interval;
					socket.send(
						JSON.stringify(
							customLogin || {
								op: 2,
								d: {
									properties: {
										os: process.platform,
										browser: "styrofoam.js",
										device: process.arch,
									},
									intents: 513,
									...this.options.login,
								},
							}
						)
					);
					return (heartbeat = () => {
						const timeout = setTimeout(() => {
							if (this.#heartbeat == 0) return;
							if (this.#pong) {
								this.emit("ping");
								this.#pong = false;
								heartbeat();
								this.#pingtime = Date.now();
								socket.send(JSON.stringify({ op: 1, d: this.#lastevent }));
							} else {
								socket.close();
								this.emit("close", "Timed out!");
								this.#heartbeat = 0;
							}
						}, this.#heartbeat);
						this.on("close", () => clearTimeout(timeout));
					})();
				case 11:
					this.#pong = true;
					this.ping = Date.now() - this.#pingtime;
					return this.emit("pong");
				case 1:
					if (data.d) this.session = data.d;
				// eslint-disable-next-line no-fallthrough
				case 0:
					return this.emit(toCamelCase(data.t.replace(/_/g, " ")), data.d);
				case 7:
				case 9:
					this.emit("disconnected", data.d);
					if (data.d || data.op == 7) {
						this.login({
							customLogin: {
								op: 6,
								d: {
									token: this.#token,
									session_id: this.session.session_id,
									seq: this.#lastevent,
								},
							},
							gateway: this.session.resume_gateway_url,
						});
					} else {
						this.emit(
							"error",
							new Error("Gateway issued disconnection without resume")
						);
						this.emit("close", "Connection closed by gateway!");
						this.destroy();
					}
			}
			this.#lastevent = data.s || this.#lastevent;
		});
		let int = setInterval(() => { }, 100000);
		this.on("close", () => clearInterval(int));
		this.socket.on('close', data => {
			if (data == 1005) return;
			this.emit('close', data);
			this.#heartbeat = 0;
		});
		this.#destroy = EventEmitter.destroy;
	}
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
	/**
	 * Set activity of the bot
	 * @param {Object} activity Activity information
	 * @param {String} activity.name Activity's name
	 * @param {Number} activity.type https://discord.com/developers/docs/topics/gateway-events#activity-object-activity-types
	 * @param {String|undefined} activity.state User's current party status, or text used for a custom status
	 * @param {String|undefined} activity.url Stream URL, is validated when type is 1
	 */
	setPresence(activity) {
		this.#currentPresense.activity = activity;
		return this.#send({
					op: 3,
					d: {
						since: null,
						activities: [activity],
						status: this.#currentPresense.status,
						afk: false,
					},
				})
	}
	#send(data) {
		return new Promise((r,j) =>
			this.socket.send(
				typeof data==='string'?data:JSON.stringify(data),
				e => (e ? j(e) : r())
			)
		);
	}
	/**
	 * Set the status of the bot
	 * @param {'online'|'dnd'|'idle'|'invisible'|'offline'} status
	 */
	setStatus(status) {
		let validator = ['online', 'dnd', 'idle', 'invisible', 'offline'];
		if (!validator.includes(status))
			throw new TypeError('Status must be one of ' + validator.join(', '));
		this.#currentPresense.status = status;
		return this.#send({
					op: 3,
					d: {
						since: null,
						activities: [this.#currentPresense.activity],
						status: status,
						afk: false,
					},
				}
			)
	}
	#currentPresense = { status: 'online', activity: {} };
	//EventEmitter's destroy
	#destroy;
	/**
	 * @type {ws}
	 */
	socket;
}
function download(url, options = {}) {
	return new Promise((r, j) =>
		get(url, options, function (res) {
			// Buffer the body entirely for processing as a whole.
			var bodyChunks = [];
			res
				.on('data', function (chunk) {
					// You can process streamed parts here...
					bodyChunks.push(chunk);
				})
				.on('end', function () {
					var body = Buffer.concat(bodyChunks);
					r(body);
					// ...and/or process the entire body here.
				})
				.on('error', j);
		}).on('error', j)
	);
}
function toCamelCase(str) {
	return str
		.split(' ')
		.map(function (word, index) {
			// If it is the first word make sure to lowercase all the chars.
			if (index == 0) {
				return word.toLowerCase();
			}
			// If it is not the first word only upper case the first char and lowercase the rest.
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join('');
}
/**
 * a
 * @param {String[]} patharray a
 */
function parse(patharray, options = {}) {
	let pa =
		"/" +
		patharray
			.map(e =>
				Number.isNaN(parseInt(e)) && !e.match(/\{[a-z_]+\}/g) ? e : "variable"
			)
			.join("/");
	let matching =
		Object.keys(apiSpec.paths).find(e =>
			e.replace(/\/\{[a-z_]+\}/g, "/variable").endsWith(pa)
		) ||
		Object.keys(apiSpec.paths).find(e =>
			e.replace(/\/\{[a-z_]+\}/g, "").endsWith(pa)
		);
	if (!matching) return undefined;
	let matchlist = matching.split("/").filter(e => e != "");
	pa.split("/")
		.filter(e => e != "")
		.forEach((e, i) => {
			if (e === "variable" && parseInt(patharray[i])) {
				matchlist[i] = patharray[i];
			}
		});
	matching = "/" + matchlist.join("/");
	return matching
		.split("/")
		.map(e => options[e.match(/{(?<i>[a-zA-Z0-9_]+)}/)?.groups?.i] || e)
		.join("/");
}
module.exports = Styrofoam;
