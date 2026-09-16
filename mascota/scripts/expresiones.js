// Genera (o regenera) los 17 grupos de expresión al final de geckonoid.svg, ocultos con display:none.
// Es la fuente de verdad de esas piezas: para retocar una, editá acá y volvé a correr.
// Uso: node mascota/scripts/expresiones.js
const fs=require("fs");
const path=require("path");
const p=path.join(__dirname,"..","geckonoid.svg");
let s=fs.readFileSync(p,"utf8");
{const a=s.indexOf('  <g id="ojos_felices"'); if(a>=0){const e=s.lastIndexOf("</svg>"); s=s.slice(0,a)+s.slice(e);}}
const r1=v=>Math.round(v*10)/10;
const L='stroke="#1E5E2E" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"';
const V='fill="#3FA34D" '+L, B='fill="#FFFFFF" '+L, N='fill="none" '+L, K='fill="#1A1A1A" '+L;
const AM='fill="#F5C518" '+L, RO='fill="#E0473F" '+L, NA='fill="#F58220" '+L, CE='fill="#6EC1E4" '+L;

// ojo base (blanco + pupila + brillo) parametrizado
const ojo=(cx,cy,dx,prx=17,pry=22)=>`    <ellipse cx="${cx}" cy="${cy}" rx="24" ry="30" ${B}/>
    <ellipse cx="${cx+dx}" cy="${cy+3}" rx="${prx}" ry="${pry}" fill="#1A1A1A"/>
    <circle cx="${cx-6}" cy="${cy-7}" r="4" fill="#FFFFFF"/>`;

// estrella de 5 puntas
const estrella=(cx,cy,R,r)=>{const pts=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5;const rad=i%2?r:R;pts.push(`${r1(cx+rad*Math.cos(a))} ${r1(cy+rad*Math.sin(a))}`);}
  return `M ${pts.join(" L ")} Z`;};

// brazo derecho levantado (tubo de 36 desde el pivote 290,254 hasta la muñeca 340,206) + puño r22 en 344,202
const brazoArriba=`    <path d="M 302.5 267 L 352.5 219 L 327.5 193 L 277.5 241 C 260.2 257.6 285.2 283.6 302.5 267 Z" ${V}/>`;
const puno=`    <circle cx="348" cy="202" r="23" ${V}/>`;

const G={
ojos_felices:`    <path d="M 138 124 C 142 98 178 98 182 124" ${N}/>
    <path d="M 258 124 C 262 98 298 98 302 124" ${N}/>`,
ojos_guino:`${ojo(160,112,1)}
    <path d="M 258 110 Q 280 130 302 110" ${N}/>`,
ojos_tristes:`${ojo(160,112,1)}
${ojo(280,112,-1)}
    <path d="M 138 100 A 24 30 0 0 1 182 100 C 174 112 146 112 138 100 Z" ${V}/>
    <path d="M 258 100 A 24 30 0 0 1 302 100 C 294 112 266 112 258 100 Z" ${V}/>`,
ojos_brillantes:`    <ellipse cx="160" cy="112" rx="24" ry="30" ${B}/>
    <ellipse cx="161" cy="114" rx="20" ry="26" fill="#1A1A1A"/>
    <circle cx="152" cy="103" r="5.5" fill="#FFFFFF"/>
    <circle cx="169" cy="125" r="3" fill="#FFFFFF"/>
    <ellipse cx="280" cy="112" rx="24" ry="30" ${B}/>
    <ellipse cx="279" cy="114" rx="20" ry="26" fill="#1A1A1A"/>
    <circle cx="272" cy="103" r="5.5" fill="#FFFFFF"/>
    <circle cx="289" cy="125" r="3" fill="#FFFFFF"/>`,
cejas_altas:`    <path d="M 148 64 Q 168 40 190 60" ${N}/>
    <path d="M 250 60 Q 272 40 292 64" ${N}/>`,
cejas_duda:`    <path d="M 148 64 Q 168 40 190 60" ${N}/>
    <path d="M 256 75 Q 276 67 296 73" ${N}/>`,
cejas_tristes:`    <path d="M 144 74 Q 166 66 186 58" ${N}/>
    <path d="M 254 58 Q 274 66 296 74" ${N}/>`,
boca_abierta:`    <ellipse cx="220" cy="181" rx="32" ry="19" ${K}/>
    <path d="M 203 197.1 A 32 19 0 0 0 237 197.1 C 234 184 206 184 203 197.1 Z" ${RO}/>`,
boca_o:`    <circle cx="220" cy="182" r="11" ${K}/>`,
boca_triste:`    <path d="M 160 190 C 184 172 256 172 280 190" ${N}/>`,
sonrisa_lateral:`    <path d="M 150 176 C 184 200 258 198 298 162" ${N}/>`,
anteojos:`    <circle cx="160" cy="114" r="40" ${N}/>
    <circle cx="280" cy="114" r="40" ${N}/>
    <path d="M 200 110 Q 220 100 240 110" ${N}/>
    <path d="M 120 112 L 110 108" ${N}/>
    <path d="M 320 112 L 330 108" ${N}/>`,
brazo_pulgar:`    <!-- pivote: 290 254 · reemplaza a brazo_der -->
${brazoArriba}
    <rect x="340" y="152" width="20" height="44" rx="10" ${V}/>
${puno}`,
brazo_diploma:`    <!-- pivote: 290 254 · reemplaza a brazo_der -->
${brazoArriba}
    <rect x="334" y="188" width="100" height="28" rx="14" ${B}/>
    <rect x="396" y="184" width="16" height="36" rx="3" ${AM}/>
${puno}`,
signo_exclamacion:`    <path d="M 408.8 24.1 L 399.8 70.1 C 397 84.5 375.4 80.3 378.2 65.9 L 387.2 19.9 C 390 5.5 411.6 9.7 408.8 24.1 Z" ${NA}/>
    <circle cx="384" cy="94" r="11" ${NA}/>`,
gotita:`    <path d="M 301 134 C 306 144 313 149 313 156 A 9 9 0 0 1 295 156 C 295 149 298 144 301 134 Z" ${CE}/>`,
estrellas:`    <path d="${estrella(78,48,24,12)}" ${AM}/>
    <path d="${estrella(362,48,24,12)}" ${AM}/>
    <path d="${estrella(300,24,16,8)}" ${AM}/>`,
};
let out="";
for(const [id,body] of Object.entries(G)) out+=`  <g id="${id}" style="display:none">\n${body}\n  </g>\n`;
const end=s.lastIndexOf("</svg>"); if(end<0) throw new Error("sin </svg>");
s=s.slice(0,end)+out+s.slice(end);
fs.writeFileSync(p,s);
console.log(`${path.relative(process.cwd(),p)}: ${Object.keys(G).length} grupos de expresión regenerados (${Object.keys(G).join(", ")})`);
