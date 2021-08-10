const http = require('http')
const fetch = require('node-fetch');
const url = require('url');
const AbortController = require('abort-controller');

var token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweEIxMGRENDhCNkIzOTNhNzNiMzc4Y2E1MDBBNzliQjFjNENhQTE4NGIiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2MjgyNTM0MTA2NDEsIm5hbWUiOiJnaC1hcmNoaXZlciJ9.BTpo6I9jeWtfRh95_Q65C8yv-3E24EfL62pzHJOyr5Y'//process.env.WEB3_TOKEN
var ipfs_api = 'http://51.15.3.135:5001' //process.env.IPFS_API

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
