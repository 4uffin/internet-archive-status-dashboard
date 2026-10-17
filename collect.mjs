// Internet Archive status collector. Run on a schedule; adds probe samples to data.json.
// Format: { v:1, updated:<ms>, b:{ "<10-min bucket>": { "<service>": [n, fails, sumOkMs, slow] } } }
import {readFileSync,writeFileSync} from "node:fs";
const SERVICES=[
 {id:"avail",url:"https://archive.org/wayback/available?url=example.com",val:j=>"archived_snapshots" in j},
 {id:"cdx",url:"https://web.archive.org/cdx/search/cdx?url=archive.org&limit=1&output=json",val:j=>Array.isArray(j)},
 {id:"search",url:"https://archive.org/advancedsearch.php?q=mediatype%3Atexts&rows=1&fl%5B%5D=identifier&output=json",val:j=>j.response&&j.response.numFound>0},
 {id:"meta",url:"https://archive.org/metadata/nasa",val:j=>!!j.metadata},
 {id:"ol",url:"https://openlibrary.org/search.json?q=archive&limit=1",val:j=>j.numFound>0},
 {id:"site",url:"https://archive.org/"},
 {id:"wb",url:"https://web.archive.org/"}
];
const CONTROLS=["https://www.gstatic.com/generate_204","https://www.cloudflare.com/cdn-cgi/trace"];
const file=process.argv[2]||"data.json",KEEP=21*144,SAMPLES=+process.env.SAMPLES||2;

async function probe(s){
  const t0=performance.now();
  try{
    const r=await fetch(s.url,{signal:AbortSignal.timeout(10000),headers:{"user-agent":"ia-status-collector"}});
    let ok=r.ok;
    if(ok&&s.val){try{ok=!!s.val(await r.json())}catch{ok=false}}else await r.body?.cancel();
    return{ok,ms:performance.now()-t0};
  }catch{return{ok:false,ms:performance.now()-t0}}
}

let d={};try{d=JSON.parse(readFileSync(file,"utf8"))}catch{}
d.v=1;d.b=d.b||{};

// per-endpoint "slow" threshold: same rule as the dashboard (median of 10-min means over 7 days)
const k0=Math.floor(Date.now()/6e5),slow={};
for(const s of SERVICES){
  const v=[];
  for(let k=k0-7*144;k<=k0;k++){const x=(d.b[k]||{})[s.id];if(x&&x[0]>x[1]&&x[2]>0)v.push(x[2]/(x[0]-x[1]))}
  if(v.length<12){slow[s.id]=3000;continue}
  v.sort((a,b)=>a-b);
  const med=v[v.length>>1],dev=v.map(x=>Math.abs(x-med)).sort((a,b)=>a-b)[v.length>>1];
  slow[s.id]=Math.min(8000,Math.max(500,med*2.5,med+4*1.4826*dev));
}

let taken=0;
for(let i=0;i<SAMPLES;i++){
  const [net,res]=await Promise.all([
    Promise.all(CONTROLS.map(u=>probe({url:u}))).then(r=>r.some(x=>x.ok)),
    Promise.all(SERVICES.map(probe))
  ]);
  if(net){ // skip samples when the runner itself has no internet
    const k=Math.floor(Date.now()/6e5),b=d.b[k]=d.b[k]||{};
    SERVICES.forEach((s,j)=>{
      const r=res[j],x=b[s.id]=b[s.id]||[0,0,0,0];
      x[0]++;
      if(!r.ok)x[1]++;else{x[2]=Math.round(x[2]+r.ms);if(r.ms>slow[s.id])x[3]++}
    });
    taken++;
  }
  if(i<SAMPLES-1)await new Promise(r=>setTimeout(r,20000));
}
for(const k of Object.keys(d.b))if(+k<k0-KEEP)delete d.b[k];
d.updated=Date.now();
writeFileSync(file,JSON.stringify(d));
console.log(`samples recorded: ${taken}/${SAMPLES}, buckets kept: ${Object.keys(d.b).length}`);
