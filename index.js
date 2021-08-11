const http = require('http')
const fetch = require('node-fetch');
const url = require('url');
const AbortController = require('abort-controller');

var token = process.env.WEB3_TOKEN
var ipfs_api = process.env.IPFS_API

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
      console.log(json)
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
  	console.log('timeout error');
    return {}
  } finally {
  	clearTimeout(timeout);
  }
}

const handler = async function (req, res) {
  var query = url.parse(req.url,true).query
  var result = await transport(query.cid, query.filename)

  if (result.cid){
    res.writeHead(200);
  } else {
    res.writeHead(500);
  }

  res.end();
}

const server = http.createServer(handler);
server.listen(process.env.PORT || 8080);
