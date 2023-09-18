import {DOMParser} from 'https://esm.sh/linkedom';

type ProductCode=string;

const families=new Set([
  'sandstone',
  'granite',
  'noah',
  'winter',
  'regs',
  'speed-bumps',
  'lo-rider',
  'strato',
  'flö',
  'rok',
  'tufa',
  'trim',
  'not-font',
  'bricks',
  'tremors'
]);

type Product = {
  code: ProductCode,
  title: string,
  price: number,
  url: string,
  year: number,
  family: string,
  count: number
};

const fileExists=async(path:string)=>{
  try{
    const stat=await Deno.stat(path);
    return stat.isFile;
  }catch(_){
    return false;
  }
};

const map: Map<ProductCode,Product>=new Map();
const baseUrl=new URL('https://settercloset.com');
const parser=new DOMParser();
let page=0;
while (true){
  ++page;
  const pageResponse=await fetch(new URL(`/collections/composite-x?page=${page}`,baseUrl));
  if(pageResponse.status!==200) break;
  const doc=parser.parseFromString(await pageResponse.text(),'text/html');
  const root=doc.querySelector('#product-loop');
  for(const p of root.querySelectorAll('[data-price][data-alpha]')){
    const href=p.querySelector('a').getAttribute('href');
    if(!/[0-9]{2,}(-[0-9])*(-kit)?$/.test(href)&&!href.includes('products/kx')){
      console.log(`-${href}`);
      continue;
    }
    console.log(`+:${href}`);
    const json=await(await fetch(new URL(`${href}.js`,baseUrl))).json();
    if(!json.available) continue;
    const {handle,title,description,tags,price,featured_image:imageUrl,url:link}=json;
    const url=new URL(link,baseUrl).toString();
    const year=parseInt(tags.find((it:string)=>/^20[12][0-9]$/.test(it)));
    const family=tags.find((tag:string)=>families.has(tag));
    const count=parseInt(/.*(?:<[pP]>\s*|\s+)([0-9]+) [Gg][rR][iI][pP][sS](?:<\/[pP]>|\s+).*/.exec(description)?.[1]||'');
    const code=handle.startsWith('kx')?
      handle.substring(0,handle.indexOf('-')):
      handle.replace(/-kit$/,'').replace(/^.*-([^0-9]+[0-9]{2,}(?:-[0-9])*(?:-kit)?)$/,'$1');
    if(!await fileExists(`img/${code}.webp`)){
      const imgResponse=await fetch(new URL(imageUrl,baseUrl),{headers:{'accept':'image/webp'}});
      switch(imgResponse.headers.get('content-type')){
        case 'image/webp': {
          await Deno.writeFile(`img/${code}.webp`, new Uint8Array(await imgResponse.arrayBuffer()));
          break;
        }
        case 'image/jpg': case 'image/jpeg': {
          await Deno.writeFile(`img/${code}.jpg`, new Uint8Array(await imgResponse.arrayBuffer()));
          break;
        }
        case 'image/png': {
          await Deno.writeFile(`img/${code}.png`, new Uint8Array(await imgResponse.arrayBuffer()));
          break;
        }
        default: throw new Error('Unexpected content-type');
      }
    }
    const product: Product={
      code,
      title,
      price,
      url,
      year,
      family,
      count
    };
    map.set(code,product);
  }
  //break;
}
const json=JSON.stringify(Object.fromEntries(map.entries()),null,2);
await Deno.writeFile('sets.json', new TextEncoder().encode(json));
