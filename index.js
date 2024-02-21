const { EventEmitter } = require('events');

const { join } = require('path'),
	{ get, request } = require('https'),
	{ readFile,stat,writeFile } = require('fs/promises'),
	{ WebSocket: ws } = require('./ws'),
	{ version } = require('./package.json'),
	APIs = {
		https: 'https://discord.com/api/',
		httpheader: token => ({
			Authorization: 'Bot ' + token,
			'User-Agent':
				'DiscordBot (https://dreamnity.in/styrocord.js, ' +
				version +
				')',
				'Content-Type':'application/json'
		}),
		spec: 'https://raw.githubusercontent.com/discord/discord-api-spec/main/specs/openapi_preview.json',
	};
var apiSpec;
class Styrocord extends EventEmitter {
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
		this.#specPromise = this.#downloadSpec()
			.then(text => (apiSpec = JSON.parse(text)))
			.then(() => {
				if (!apiSpec?.openapi)
					throw new Error(
						'Error downloading the API specification: No content'
					);
					this.interact = createInteract([],options.login.token)
				Object.keys(apiSpec.paths).forEach(e => {
					let a = e.match(/\/([a-z0-9]+).*/)[1];
					if (!(a in this)) this[a] = this.interact[a];
				});
			})
			.catch(e => {
				const err = new Error(
					'Error downloading the API specification: ' + e.message
				);
				err.stack = e.stack
				throw err;
			});
		download(join(APIs.https, "gateway")).then(result => {
			APIs.gateway = JSON.parse(result).url;
			this.login();
		});
	}
	#validateLogin(options) {
		if (!options?.login?.token)
			throw new ReferenceError('Token is not provided! (options.login.token)');
		this.#token = options.login.token;
	}
	#specPromise;
	session = {};
	#token = '';
	#heartbeat = 0;
	#pingtime = 0;
	ping = 0;
	#lastevent = 0;
	#pong = true;
	cache = { guilds: [] };
	/**
	 * @type {Proxy}
	 */
	interact;
	options = {};
	/**
	 * Login to the bot
	 * @param {Object} option Login option
	 */
	login(config) {
		const { gateway,customLogin } = config||{};
		if (this.socket) this.socket.close();
		this.socket = new ws(gateway || APIs.gateway).on('message', r => {
			let socket = this.socket;
			let data = JSON.parse(r),
				heartbeat;
			this.emit('gatewayDebug',data);
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
										browser: "styrocord.js",
										device: process.arch,
									},
									intents: 513,
									...this.options.login,
								},
							}
						)
					);
					return (heartbeat = () => {
						this.#hbtimeout = setTimeout(() => {
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
					})();
				case 11:
					this.#pong = true;
					this.ping = Date.now() - this.#pingtime;
					return this.emit("pong");
				case 1:
					if (data.d) this.session = data.d;
				// eslint-disable-next-line no-fallthrough
				case 0:
					if(data.t==='GUILD_CREATE'&&this.ping==0) return this.cache.guilds.push(data.d);
					if(data.t==='READY') return this.#specPromise.finally(()=>this.emit('ready',data.d));
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
		let cleanupFn = () => clearTimeout(this.#hbtimeout);
		this.on("close", cleanupFn);
		let int = setInterval(() => { }, 100000);
		this.on("close", () => clearInterval(int));
		this.socket.on('close', data => {
			if (data == 1005) return;
			this.emit('close', data);
			this.#heartbeat = 0;
		});
		this.socket.on('error', e => { throw new Error('Discord gateway socket error: '+e.message)})
		this.#destroy = EventEmitter.destroy;
	}
	async #downloadSpec() {
		const cache='./cachedSpec.json';
		try {
			if((await stat(cache)).birthtimeMs < new Date(Date.now()-8.64e+7)) throw '';
			return await (readFile(cache).then(e=>e.toString()));
		} catch {
			return await download(APIs.spec).then(e=>{writeFile(cache,JSON.stringify(JSON.parse(e)));return e});
		}
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
	#hbtimeout;
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
const methods = {
	'get': 'GET',
	'create': 'POST',
	'post': 'POST',
	'delete': 'DELETE',
	'edit': 'PATCH',
	'patch': 'PATCH',
	'add': 'PUT',
	'put': 'PUT',
}
/**
 * a
 * @param {String[]} patharray a
 * @returns {{url: string,method?: string}}
 */
function parse(patharray, options = {}) {
	try {
		let method = methods[patharray[patharray.length - 1].toLowerCase()];
		if (method) patharray.pop();
		let pa =
			"/" +
			patharray
				.map(e =>
					Number.isNaN(parseInt(e)) && !e.match(/\{[a-z_]+\}/g) ? e : "variable"
				)
				.join("/");
		var matching =
			Object.keys(apiSpec.paths).find(e =>
				e.replace(/\/\{[a-z_]+\}/g, "/variable").endsWith(pa)
			) ||
			Object.keys(apiSpec.paths).find(e =>
				e.replace(/\/\{[a-z_]+\}/g, "").endsWith(pa)
			)
			if(!matching) {
				let pa2 = pa.replace(/\/variable/g, "");
				matching = Object.keys(apiSpec.paths).find(e =>
					e.replace(/\/\{[a-z_]+\}/g, "").endsWith(pa2)
				);
			}
		if (!matching) return undefined;
		let matchlist = matching.split("/").filter(e => e != "");
		pa.split("/")
			.filter(e => e != "")
			.forEach((e, i) => {
				if (e === "variable" && parseInt(patharray[i])) {
					matchlist[i] = patharray[i];
				}
			});
		let original = matching;
		matching = "/" + matchlist.join("/");
		return {
			method: method || Object.keys(apiSpec.paths[original]).find(e=>!!apiSpec?.paths[original][e]?.operationId).toUpperCase(),
			url: matching
				.split("/")
				.map(e => options[e.match(/{(?<i>[a-zA-Z0-9_]+)}/)?.groups?.i] || e)
				.join("/")
		}
	} catch { return undefined }
}
	/**
	 * Create a proxy that interact with discord api
	 * @param {String[]} path Chaining path to api
	 * @param {Object} spec Discord API OpenAPI specification
	 * @returns {Proxy}
	 */
	function createInteract(path = [],token = '') {
		let pth = path.join('/');
		function send(options) {
			let parsed = parse(path, options);
			if (!parsed)
				throw new Error(
					"Endpoint not found (trying to search for " + pth + ")"
				);
			if(m=parsed.url.match(/\/\{([a-z_]+)\}/)) throw new Error(
				'Missing "'+m[1]+'" parameter'
			)
			return new Promise(function (resolve, reject) {
				request(
					new URL('/api'+parsed.url, APIs.https),
					{
						headers: APIs.httpheader(token),
						method: parsed.method||"POST",
					},
					res => {
						var chunks = '';
						res.on('data', e => chunks += e)
						res.on('end', () => {
							if(!chunks.match(/^[\[\{]/g)) reject('DiscordAPIError: Server didn\'t respond in JSON:\n'+chunks);
							const data = JSON.parse(chunks);
							if (res.statusCode===429&&data.retry_after) {
								return setTimeout(()=>send(options).then(resolve,reject),data.retry_after)
							}
							else if (!res.statusCode.toString().startsWith('2')&&data.message) {
								const err = new Error(data.message);
								err.name = 'DiscordAPIError';
								err.code = data.code;
								return reject(err);
							}
							resolve(data);
						}).on('error',reject);
					}
				).end(JSON.stringify(options)).on('error',reject);
			});
		}
		return new Proxy(send, {
			get(t, p) {
				return createInteract(path.concat(...p.split(/[./]/)),token);
			},
			set(t,p,n) {
				path.push(...p.split(/[./]/),'edit')
				return send(n)
			},
			deleteProperty(t,p) {
				path.push(...p.split(/[./]/),'delete')
				return send();
			}
		});
	}
module.exports = Styrocord;
