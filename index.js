const http = require('http')
const fetch = require('node-fetch');
const url = require('url');

var token = process.env.WEB3_TOKEN
var ipfs_api = process.env.IPFS_API

async function transport(cid, filename) {
  console.log('Uploading', cid, filename)
  var url = `${ipfs_api}/api/v0/dag/export?arg=${cid}&carversion=1`
  var download = await fetch(url, { method: 'POST' })
  var upload = await fetch(`https://api.web3.storage/car`, {
    method: 'POST',
    headers: {
        "Authorization": `Bearer ${token}`,
        "x-name": filename
    },
    body: download.body
  })
  var json = await upload.json()
  console.log(json)
}

const handler = async function (req, res) {
  var query = url.parse(req.url,true).query
  await transport(query.cid, query.filename)

  res.writeHead(200);
  res.end();
}

const server = http.createServer(handler);
server.listen(8080);