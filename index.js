// Talha Jahangir
const fs = require("fs");
const url = require("url");
const http = require("http");
const https = require("https");
const querystring = require("querystring");

const {client_id, client_secret, scope, redirect_uri, response_type, grant_type} = require("./auth/credentials.json");

const host = "localhost" 
const port = 3000;
const server = http.createServer();
var BToken = "";
var QR = "";
var DI = "";
server.on("listening", listen_handler);
server.listen(port);
function listen_handler(){
	console.log(`Now Listening on Port ${port}`);
	console.log(server.address());
}


server.on("request", request_handler);
function request_handler(req, res){
    console.log(`New Request from ${req.socket.remoteAddress} for ${req.url}`);
    if(req.url === "/"){
        const form = fs.createReadStream("html/index.html");
		res.writeHead(200, {"Content-Type": "text/html"})
		form.pipe(res);
    }
    else if (req.url.startsWith("/add_code")){
		const user_input = new URL(req.url, 'https://${req.headers.host}').searchParams;
		const number = user_input.get('number');
		console.log(number);
		if(number == null || number == ""){
			not_found(res);
		}
		else{
			const quote_endpoint = `https://nodejs-quoteapp.herokuapp.com/quote/${number}`;
			const quote_request = https.get(quote_endpoint, {method:"GET"});
			quote_request.once("response", process_stream);
			function process_stream (quote_stream){
				let quote_data = "";
				quote_stream.on("data", chunk => quote_data += chunk);
				quote_stream.on("end", () => serve_results(quote_data, res));
			}
		}	
		
	
	}
	else if(req.url.startsWith("/receive_code")){
		const {code, scope} = url.parse(req.url, true).query;
		//console.log(code);
		
        if(code === undefined){
			not_found(res);
			return;
		}
		
		send_token_request(code, res);
	}
  
	else{
		not_found(res);
    }
}

function serve_results(quote_data, res){
	let quote_object = JSON.parse(quote_data);
	const quotes =  quote_object.quotes;
	let quote_results = quotes.join('\n');;
	QR = quote_results
	console.log(quote_results);
	// only after i get results from the first API will the second API be called.
	redirect_to_google(res);

	
}
function redirect_to_google(res){
	const authorization_endpoint = "https://accounts.google.com/o/oauth2/v2/auth";
	console.log({client_id,redirect_uri,response_type, scope});
	let uri = querystring.stringify({client_id, redirect_uri, response_type, scope});
	res.writeHead(302, {Location: `${authorization_endpoint}?${uri}`})
	   .end();
}

function send_token_request(code, res){
	const token_endpoint = "https://oauth2.googleapis.com/token";
	const post_data = querystring.stringify({client_id, client_secret, code, grant_type, redirect_uri});
	console.log("secret stuff");
	let options = {
		method: "POST",
		headers:{
			"Content-Type":"application/x-www-form-urlencoded"
		}
	}
	https.request(
		token_endpoint, 
		options, 
		(token_stream) => process_stream(token_stream, receive_access_token, res)
	).end(post_data);
}

function process_stream (stream, callback , ...args){
	let body = "";
	stream.on("data", chunk => body += chunk);
	stream.on("end", () => callback(body, ...args));
}

function receive_access_token(body, res){
	const tokendetails = JSON.parse(body);
	let access_token = tokendetails.access_token;
	BToken = access_token;
	send_create_doc_request(access_token, res);
}

function send_create_doc_request(access_token, res){
	const task_endpoint = "https://docs.googleapis.com/v1/documents";
	const post_data = JSON.stringify({
		"title": "require(motivation)",
		"body": {
		  "content": [
			{}
		  ]
		}
	  });
	const options = {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${access_token}`
		}
	}
	https.request(
		task_endpoint, 
		options, 
		(task_stream) => process_stream(task_stream, receive_response, res)
	).end(post_data);
}
function receive_response(body, res){
	const results = JSON.parse(body);
	let doc_id = results.documentId;
	DI= doc_id
	console.log("check if this is the right doc");
	console.log(doc_id);
	edit_doc_request(BToken, res);
}

function edit_doc_request(BToken, res){
	const task_endpoint = 'https://docs.googleapis.com/v1/documents/${DI}:batchUpdate';
	const post_data = JSON.stringify({
		"requests": [
		  {
			"insertText": {
			  "location": {
				"index": 2
			  },
			  "text": QR
			}
		  }
		]
	  });
	const options = {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${BToken}`
		}
	}
	https.request(
		task_endpoint, 
		options, 
		(edit_stream) => process_stream(edit_stream, edit_response, res)
	).end(post_data);
}
function edit_response(body, res){
	const results = JSON.parse(body);
		res.writeHead(200, {"Content-Type": "text/html"});
	res.end(`<h1>A new document has been created, PLease copy your favorite quotes to it.  :</h1><ul>${QR}</ul>`);
}

function not_found(res){
	res.writeHead(404, {"Content-Type": "text/html"});
	res.end(`<h1>404 Not Found</h1>`);
}
