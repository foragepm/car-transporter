const http = require('http')
const fetch = require('node-fetch');
const url = require('url');
const AbortController = require('abort-controller');
const Hash = require('ipfs-only-hash')

var token = process.env.WEB3_TOKEN
var ipfs_api = process.env.IPFS_API

async function hash(url) {
  var download = await fetch(url)
  // var downloadClone = await download.clone();
  // var length = (await downloadClone.text()).length
  var cid = await Hash.of(download.body, {cidVersion: 1, rawLeaves: true})
  var json = {}
  // json.length = length
  json.cid = cid
  return json
}

async function upload(url, filename) {
  var downloadStart = Date.now()
  var download = await fetch(url)

  var controller = new AbortController();
  var timeout = setTimeout(() => {
    controller.abort();
  }, 1000*20);

  if (download.headers.get('content-length')){
    var length = download.headers.get('content-length')
  } else {
    var downloadClone = await download.clone();
    var length = (await downloadClone.text()).length
  }

  var downloadEnd = Date.now()
  var downloadTime = downloadEnd-downloadStart

  var max_size = 1024*1000*30

  if (length > max_size){
    console.log(JSON.stringify({url: url, length: length, error: 'too big'}))
    return {length: length, error: 'too big'}
  }

  try {
    var uploadStart = Date.now()
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
    var uploadEnd = Date.now()

    var uploadTime = uploadEnd-uploadStart

    json.filename = filename
    json.length = length
    json.download = downloadTime
    json.upload = uploadTime
    if (json.cid){
      console.log(JSON.stringify(json))
    } else {
      var error = json
      error.url = url
      error.filename = filename

      console.error(JSON.stringify(error))
    }
    return json
  } catch (error) {
    console.error(error)
    console.log(JSON.stringify({error: "timeout", filename: filename, length: length}));
    return {error: "timeout", length: length}
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
    clearTimeout(timeout);
    return json
  } catch (error) {
  	console.log(JSON.stringify({error: "timeout", cid: cid, filename: filename}));
    clearTimeout(timeout);
    return {}
  } finally {
  	clearTimeout(timeout);
  }
}

const handler = async function (req, res) {
  var parsedUrl = url.parse(req.url,true)
  var query = parsedUrl.query

  if(parsedUrl.pathname == '/upload'){
    if(query.url){
      var result = await upload(query.url, query.filename)
    } else {
      var result = {}
    }
  } else if (parsedUrl.pathname == '/hash') {
    if(query.url){
      var result = await hash(query.url)
    } else {
      var result = {}
    }
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
