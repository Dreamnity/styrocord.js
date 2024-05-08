const { writeFileSync, readFileSync } = require('fs')
const ws = readFileSync("./ws.js").toString();
fetch(
	new URL("/developers/javascript-minifier/api/raw", "https://www.toptal.com"),
	{
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body:
			"input=" +
			encodeURIComponent(
				readFileSync("index.js")
					.toString()
					.replace(
						"require('./ws')",
						ws
							.substring(1, ws.length - 1)
							.replace("module.exports=pe", "return pe")
					)
			),
	}
)
	.then(e => e.text())
	.then(e => writeFileSync("minified.js", e));