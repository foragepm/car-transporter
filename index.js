const http = require('http')
const fetch = require('node-fetch');
const url = require('url');
const AbortController = require('abort-controller');

var token = process.env.WEB3_TOKEN
var ipfs_api = process.env.IPFS_API

async function upload(url, filename) {
  var download = await fetch(url)

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 1000*25);

  const downloadClone = await download.clone();

  var txt = await downloadClone.text()
  var length = txt.length

  try {
    var upload = await fetch(`https://api.web3.storage/upload`, {
      method: 'POST',
      headers: {
          "Authorization": `Bearer ${token}`,
          "x-name": filename
      },
      body: download.body,
      signal: controller.signal
    })
    var json = await upload.json()
    json.length = length
    if (json.cid){
      console.log(JSON.stringify(json))
    } else {
      var error = json
      error.url = url
      error.filename = filename

      var download = await fetch(url)
      var txt = await download.text()
      error.length = txt.length
      console.error(JSON.stringify(error))
    }
    return json
  } catch (error) {
    console.log(JSON.stringify({error: "timeout", cid: cid, filename: filename, length: length}));
    return {}
  } finally {
    clearTimeout(timeout);
  }
}

async function transport(cid, filename) {
  if(!cid){ return {} }
  console.log('Uploading', cid, filename)
  var url = `${ipfs_api}/api/v0/dag/export?arg=${cid}&carversion=1`
  var download = await fetch(url, { method: 'POST' })

  const controller = new AbortController();
  const timeout = setTimeout(() => {
  	controller.abort();
  }, 1000*30);

  try {
    var upload = await fetch(`https://api.web3.storage/car`, {
      method: 'POST',
      headers: {
          "Authorization": `Bearer ${token}`,
          "x-name": filename
      },
      body: download.body,
      signal: controller.signal
    })
    var json = await upload.json()
    if (json.cid){
      console.log(JSON.stringify(json))
    } else {
      var error = json
      error.cid = cid
      error.filename = filename

      var download = await fetch(url, { method: 'POST' })
      var txt = await download.text()
      error.length = txt.length
      console.error(JSON.stringify(error))
    }
    return json
  } catch (error) {
  	console.log(JSON.stringify({error: "timeout", cid: cid, filename: filename}));
    return {}
  } finally {
  	clearTimeout(timeout);
  }
}

const handler = async function (req, res) {
  var parsedUrl = url.parse(req.url,true)
  var query = parsedUrl.query

  if(parsedUrl.pathname == '/upload'){
    var result = await upload(query.url, query.filename)
  } else {
    var result = await transport(query.cid, query.filename)
  }

  res.setHeader('Content-Type', 'application/json');

  if (result.cid){
    res.writeHead(200);
  } else {
    res.writeHead(500);
  }

  res.end(JSON.stringify(result));
}

const server = http.createServer(handler);
server.listen(process.env.PORT || 8080);
