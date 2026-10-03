import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.txt':'text/plain; charset=utf-8'};
const port=Number(process.env.PORT||4173);
const prefix='/Legal-Market-Monitor/';
http.createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path===prefix.slice(0,-1)){res.writeHead(302,{Location:prefix});res.end();return;}const relativePath=path.startsWith(prefix)?path.slice(prefix.length):path.slice(1);const file=path==='/__qa'?resolve('qa.html'):resolve(root,relativePath||'index.html');if(path!=='/__qa'&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${port}${prefix}`));
