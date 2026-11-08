import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Deterministic city: the same seed gives the same architecture, inhabitants and signs.
let seed=2077;
function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const range=(a,b)=>a+random()*(b-a), pick=a=>a[Math.floor(random()*a.length)];
const clamp=THREE.MathUtils.clamp;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#091923');
scene.fog=new THREE.FogExp2('#142b35',.0064);
const camera=new THREE.PerspectiveCamera(51,innerWidth/innerHeight,.15,650);
camera.position.set(11,19,58);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
renderer.outputColorSpace=THREE.SRGBColorSpace;
document.querySelector('#world').appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(-5,18,-18);controls.enableDamping=true;controls.dampingFactor=.055;
controls.minDistance=5;controls.maxDistance=185;controls.maxPolarAngle=Math.PI*.72;
controls.screenSpacePanning=true;
scene.add(new THREE.HemisphereLight('#92c6da','#172126',1.55));
const moon=new THREE.DirectionalLight('#a6d7ef',2.3);moon.position.set(-70,100,30);scene.add(moon);
const warmFill=new THREE.DirectionalLight('#ff9a68',.5);warmFill.position.set(35,20,-20);scene.add(warmFill);

const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.42,.6,.95);composer.addPass(bloom);
const grade=new ShaderPass({uniforms:{tDiffuse:{value:null},time:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D tDiffuse;uniform float time;varying vec2 vUv;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float vignette=1.-smoothstep(.22,.85,length((vUv-.5)*vec2(1.,.8)));c*=mix(.72,1.,vignette);float grain=fract(sin(dot(vUv+fract(time*.01),vec2(12.9898,78.233)))*43758.5453)-.5;c+=grain*.0015;gl_FragColor=vec4(c,1.);}`});composer.addPass(grade);composer.addPass(new OutputPass());

const materials=new Map(), batches=new Map();
const unitBox=new THREE.BoxGeometry(1,1,1), unitCylinder=new THREE.CylinderGeometry(1,1,1,8), unitSphere=new THREE.SphereGeometry(1,9,6);
const roundedBody=new RoundedBoxGeometry(1,1,1,2,.065);
const carCabin=new THREE.BoxGeometry(1,1,1);const cabinPositions=carCabin.attributes.position;
for(let i=0;i<cabinPositions.count;i++)if(cabinPositions.getY(i)>0){cabinPositions.setX(i,cabinPositions.getX(i)*.86);cabinPositions.setZ(i,cabinPositions.getZ(i)*.72);}carCabin.computeVertexNormals();
const dummy=new THREE.Object3D();
function mat(color,roughness=.75,metalness=.1){const key=`${color}/${roughness}/${metalness}`;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));return materials.get(key);}
function emit(color,power=1){const key=`e${color}/${power}`;if(!materials.has(key))materials.set(key,new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(power)}));return materials.get(key);}
const concrete=mat('#293942'),dark=mat('#101c24'),metal=mat('#526169',.34,.65), curb=mat('#6a7777'),rubber=mat('#080e14'),glass=mat('#0e2b39',.18,.65);
const warm=emit('#ffb565',1.8),white=emit('#d1eff3',2.4),red=emit('#ff3021',2.5),cyan=emit('#6ce7fa',1.9);
function instance(geometry,material,x,y,z,sx,sy,sz,ry=0,rz=0,rx=0){const key=geometry.uuid+material.uuid;let b=batches.get(key);if(!b){b={geometry,material,matrices:[]};batches.set(key,b);}dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();b.matrices.push(dummy.matrix.clone());}
const box=(x,y,z,w,h,d,m=concrete,ry=0)=>instance(unitBox,m,x,y,z,w,h,d,ry);
const cylinder=(x,y,z,r,h,m=metal)=>instance(unitCylinder,m,x,y,z,r,h,r);
function line(points,color='#273a43'){const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color}));scene.add(l);return l;}
function point(x,y,z,color,intensity=100,distance=22){const light=new THREE.PointLight(color,intensity,distance,2);light.position.set(x,y,z);scene.add(light);return light;}
function finishBatches(){for(const b of batches.values()){const mesh=new THREE.InstancedMesh(b.geometry,b.material,b.matrices.length);b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.computeBoundingSphere();scene.add(mesh);}batches.clear();}
function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;}
function signTexture(title,sub,bg='#17282d',fg='#fff1cf',vertical=false){return canvasTexture(vertical?256:1024,vertical?1024:256,(c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.strokeStyle=fg;c.lineWidth=3;c.strokeRect(12,12,w-24,h-24);c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';if(vertical){const letters=[...title];c.font=`bold ${Math.min(170,760/letters.length)}px "Yu Gothic","Microsoft YaHei",sans-serif`;letters.forEach((v,i)=>c.fillText(v,w/2,110+i*760/letters.length));c.font='21px Arial';c.fillText(sub,w/2,970);}else{c.font=`700 ${title.length>13?74:112}px "Yu Gothic","Microsoft YaHei",sans-serif`;c.fillText(title,w/2,110,w-65);c.font='24px Arial';c.fillText(sub,w/2,210,w-65);}for(let i=0;i<h;i+=4){c.fillStyle='#00000012';c.fillRect(0,i,w,1);}});}
function panel(texture,x,y,z,w,h,ry=0,power=1.2,frame=true){const m=new THREE.MeshBasicMaterial({map:texture,color:new THREE.Color(power,power,power)});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);mesh.position.set(x,y,z);mesh.rotation.y=ry;scene.add(mesh);if(frame){box(x-Math.sin(ry)*.22,y,z-Math.cos(ry)*.22,w+.25,h+.25,.24,dark,ry);}return mesh;}
function label(title,sub,x,y,z,w,h,bg,fg,ry=0,vertical=false,power=1.2){return panel(signTexture(title,sub,bg,fg,vertical),x,y,z,w,h,ry,power);}

// Wet asphalt: a planar reflection broken by two scales of ripples and pavement grain.
const wetShader={...Reflector.ReflectorShader,uniforms:THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms)};
wetShader.uniforms.time={value:0};
wetShader.vertexShader=wetShader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 vWorld;').replace('vUv = textureMatrix','vWorld=(modelMatrix*vec4(position,1.)).xyz; vUv = textureMatrix');
wetShader.fragmentShader=`uniform vec3 color;uniform sampler2D tDiffuse;uniform float time;varying vec4 vUv;varying vec3 vWorld;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec2 uv=vUv.xy/vUv.w;vec2 p=vWorld.xz;float grain=hash(floor(p*35.));float ripple=sin(p.y*37.+sin(p.x*11.)+time*.8)*.00065+sin(p.y*8.+p.x*3.)*.0009;uv+=vec2(ripple,sin(p.x*19.+p.y*9.)*.00065);vec3 ref=texture2D(tDiffuse,uv).rgb;ref+=texture2D(tDiffuse,uv+vec2(.0018,.0008)).rgb;ref+=texture2D(tDiffuse,uv-vec2(.0018,.0008)).rgb;ref/=3.;float wet=.28+.17*sin(p.x*.4+p.y*.2)*sin(p.y*.8)+grain*.07;vec3 road=vec3(.019,.029,.035)*(grain*.5+.8);gl_FragColor=vec4(road+ref*wet,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const road=new Reflector(new THREE.PlaneGeometry(600,600),{textureWidth:1536,textureHeight:1536,clipBias:.002,color:0x526b73,shader:wetShader,multisample:0});road.rotation.x=-Math.PI/2;road.position.y=.015;scene.add(road);

// Crosswalks and traffic markings are slightly elevated, weathered, physical strips.
const paint=mat('#9ba7a0',.75,.05),yellow=mat('#cfa24c');
function crosswalk(cx,cz,length,width,angle){const count=Math.floor(length/1.65);for(let i=0;i<count;i++){const t=-length/2+i*1.65;box(cx+Math.cos(angle)*t,.045,cz-Math.sin(angle)*t,1.0,.027,width,paint,angle);}}
crosswalk(0,-14,32,4.8,0);crosswalk(0,14,32,4.8,0);crosswalk(-14,0,32,4.8,Math.PI/2);crosswalk(14,0,32,4.8,Math.PI/2);
crosswalk(0,0,35,4.8,Math.PI/4);crosswalk(0,0,35,4.8,-Math.PI/4);
for(let s of [-1,1])for(let t=24;t<180;t+=9){for(let lane of [-10.8,-3.5,3.5,10.8]){box(lane,.045,s*t,.12,.025,4.3,paint);box(s*t,.046,lane,4.3,.025,.12,paint);}box(.25,.045,s*t,.11,.025,8.8,yellow);box(-.25,.045,s*t,.11,.025,8.8,yellow);box(s*t,.045,.25,8.8,.025,.11,yellow);box(s*t,.045,-.25,8.8,.025,.11,yellow);}
for(let s of [-1,1]){box(0,.05,s*20,29,.025,.5,paint);box(s*20,.05,0,.5,.025,29,paint);}
const arrowTexture=canvasTexture(128,256,c=>{c.fillStyle='#d3d1b9';c.beginPath();c.moveTo(64,15);c.lineTo(110,90);c.lineTo(80,90);c.lineTo(80,220);c.lineTo(48,220);c.lineTo(48,90);c.lineTo(18,90);c.closePath();c.fill();});
for(let z of [-30,-55,-85,30,55,85])for(let x of [-7.1,7.1]){const m=new THREE.Mesh(new THREE.PlaneGeometry(1.6,3.2),new THREE.MeshBasicMaterial({map:arrowTexture,transparent:true,opacity:.65}));m.rotation.x=-Math.PI/2;m.rotation.z=x<0?0:Math.PI;m.position.set(x,.065,z);scene.add(m);}
// Pavement islands, inset curb edges, drains and tactile guidance strips.
for(let sx of [-1,1])for(let sz of [-1,1]){box(sx*67,.16,sz*65,99,.3,95,mat('#3b4a50'));box(sx*18,.26,sz*65,.4,.3,95,curb);box(sx*67,.26,sz*18,99,.3,.4,curb);for(let j=22;j<110;j+=3){box(sx*20,.325,sz*j,.33,.025,2.9,yellow);box(sx*j,.325,sz*20,2.9,.025,.33,yellow);for(let k=0;k<7;k++){box(sx*17.52,.04,sz*j+k*.13,.35,.025,.055,dark);box(sx*j+k*.13,.04,sz*17.52,.055,.025,.35,dark);}}for(let j=22;j<105;j+=4){box(sx*j,.32,sz*65,.025,.015,94,mat('#25363c'));box(sx*65,.32,sz*j,94,.015,.025,mat('#25363c'));}}
for(let i=0;i<32;i++){const x=range(-90,90),z=range(-100,90);if(Math.abs(x)<17||Math.abs(z)<17){cylinder(x,.045,z,.62,.03,metal);for(let a=0;a<5;a++)box(x-.4+a*.2,.065,z,.045,.015,.8,dark);}}

// Window atlases have interiors, blinds, unlit rooms and varying colour temperatures.
const facadeTextures=[];
for(let v=0;v<5;v++)facadeTextures.push(canvasTexture(512,1024,(c,w,h)=>{c.fillStyle=['#263942','#364248','#25343d','#343d41','#17303b'][v];c.fillRect(0,0,w,h);for(let row=0;row<24;row++)for(let col=0;col<10;col++){const x=col*51.2,y=row*42.66;const on=random()>.44;c.fillStyle=on?pick(['#859c9d','#9a947c','#3b6677','#b8af8a','#597a83','#d7c6a0']):pick(['#162b35','#1b333e','#213b45']);c.fillRect(x+6,y+7,38,28);if(on){c.fillStyle='#101f2980';c.fillRect(x+6,y+7,38,range(0,16));if(random()>.5){c.fillRect(x+range(8,32),y+19,4,16);c.fillRect(x+6,y+28,38,2);}}c.fillStyle='#101b2380';c.fillRect(x+24,y+7,2,28);c.fillStyle='#66777c45';c.fillRect(x,y+39,51,2);}for(let i=0;i<9000;i++){c.fillStyle=random()>.5?'#fff5':'#0003';c.fillRect(random()*w,random()*h,1,1);}}));
const facadeMats=facadeTextures.map(t=>new THREE.MeshStandardMaterial({map:t,emissiveMap:t,emissive:'#c0d7e0',emissiveIntensity:.32,roughness:.72,metalness:.18}));
const buildings=[];
function building(x,z,w,d,h,variant=0,details=true){
 const fm=facadeMats[variant%5];box(x,h/2+.4,z,w,h,d,fm);box(x,h+.45,z,w+.5,.45,d+.5,metal);box(x,h+.8,z,w-.8,.4,d-.8,dark);
 // Vertical pilasters and pronounced horizontal floor lines lend scale to the facade.
 for(let xx=-w/2;xx<=w/2+.1;xx+=w/Math.max(2,Math.floor(w/4))){box(x+xx,h/2,z+d/2+.035,.18,h,.16,metal);box(x+xx,h/2,z-d/2-.035,.18,h,.16,metal);}
 for(let y=5;y<h;y+=4.2){box(x,y,z+d/2+.08,w+.1,.15,.25,concrete);box(x,y,z-d/2-.08,w+.1,.15,.25,concrete);box(x+w/2+.08,y,z,.25,.15,d,concrete);box(x-w/2-.08,y,z,.25,.15,d,concrete);}
 if(details){for(let i=0;i<Math.min(6,w/3);i++){let xx=x+range(-w*.38,w*.38),zz=z+range(-d*.38,d*.38);box(xx,h+1.2,zz,2.1,1.3,1.7,metal);cylinder(xx,h+1.9,zz,.6,.15,dark);for(let j=0;j<5;j++)box(xx-.7+j*.33,h+1.3,zz+.86,.06,.75,.02,dark);}cylinder(x+w*.3,h+3,z-d*.3,.06,5,metal);box(x+w*.3,h+4.7,z-d*.3,2.6,.05,.05,metal);box(x+w*.3,h+4,z-d*.3,1.8,.05,.05,metal);
 for(let y=7;y<h-1;y+=5){box(x+w/2+.3,y,z-d*.25,.7,1,1.8,metal);for(let j=0;j<5;j++)box(x+w/2+.67,y-.3+j*.15,z-d*.25,.025,.04,1.5,dark);}
 }
 buildings.push({x,z,w,d,h});return {x,z,w,d,h};
}
// Four deliberately asymmetric commercial blocks and narrow secondary alleys.
building(-34,-35,27,27,51,0);building(34,-34,26,26,64,1);building(-64,-32,23,23,39,2);building(64,-35,25,29,47,3);
building(-33,-69,24,27,73,4);building(35,-70,28,29,43,2);building(-68,-69,26,28,62,1);building(70,-73,27,30,79,0);
building(-34,36,26,27,39,2);building(37,37,28,28,44,4);building(-67,33,25,25,57,1);building(73,35,27,27,35,3);
building(-34,72,27,29,47,3);building(35,75,26,31,58,0);building(-71,73,30,30,69,4);building(73,73,28,28,51,1);
for(let i=0;i<36;i++){let side=i%2?1:-1;let x=side*range(25,140),z=-100-Math.floor(i/2)*9;building(x,z,range(13,24),range(15,26),range(40,115),i,false);}
for(let i=0;i<14;i++){const x=(i%2?1:-1)*range(103,180),z=range(-85,70);building(x,z,range(16,26),range(18,25),range(38,90),i,false);}
// A stepped skyline closes the vanishing point instead of leaving an empty horizon.
building(-7,-270,27,30,102,4,false);building(26,-250,20,23,85,0,false);building(-30,-235,22,25,92,2,false);
for(let i=16;i<buildings.length;i++){const b=buildings[i];if(i%3===0){box(b.x,b.h+3,b.z,b.w*.7,5,b.d*.7,facadeMats[i%5]);box(b.x,b.h+5.6,b.z,b.w*.72,.2,b.d*.72,metal);cylinder(b.x,b.h+8,b.z,.045,5,metal);instance(unitSphere,red,b.x,b.h+10.5,b.z,.13,.13,.13);}if(i%4===0){box(b.x-b.w/2-.07,b.h*.55,b.z+b.d/2,.08,b.h*.75,.08,emit('#529fae',.7));}}

// Every street-facing ground floor has its own illuminated shop and upper tenant signs.
const tenants=[['珈琲 夜更かし','COFFEE & RECORDS','#18362e','#ffe1a2'],['麺屋 一番','RAMEN / OPEN UNTIL 5AM','#7a251b','#ffe9c3'],['カラオケ','KARAOKE • 24 HOURS','#a12a4c','#fff4dd'],['青山書店','BOOKS / MUSIC / CULTURE','#e7dfbf','#26332e'],['ゲームセンター','GAME STATION 24H','#193b78','#d9ecff'],['焼肉 楽園','YAKINIKU / 3F','#7d231b','#ffe2a1'],['薬 マツモト','DRUG & COSMETICS','#d7b642','#262e31'],['コンビニ','CONVENIENCE STORE','#1c7a69','#e8f5c9'],['レコード','VINYL / LISTENING BAR','#1c2228','#ffbe80'],['居酒屋 灯','IZAKAYA / B1F','#963e26','#fff0bd'],['写真と暮らし','CAMERA & LIFE','#1c6175','#e3f4ed'],['ネオン喫茶','LATE NIGHT CAFE','#5b315c','#ffb1bf']];
const shopTextures=tenants.map((t,index)=>canvasTexture(768,512,(c,w,h)=>{
 const gradient=c.createLinearGradient(0,0,0,h);gradient.addColorStop(0,index%3?'#7c6244':'#426567');gradient.addColorStop(1,'#1f292a');c.fillStyle=gradient;c.fillRect(0,0,w,h);
 c.fillStyle='#e7c68e';c.fillRect(16,28,w-32,5);c.fillStyle='#172226';c.fillRect(30,65,340,110);c.fillStyle='#e8d2a5';c.font='21px sans-serif';c.fillText(t[0],45,98);c.font='13px sans-serif';for(let i=0;i<4;i++)c.fillText(['本日のおすすめ  ¥680','HOT COFFEE / ¥420','TOKYO SPECIAL  ¥950','TAKE OUT / OPEN 24H'][i],45,123+i*14);
 for(let r=0;r<4;r++){const y=220+r*65;c.fillStyle='#c7b88c';c.fillRect(400,y,340,7);for(let j=0;j<18;j++){c.fillStyle=pick(['#ac4f35','#d3ba76','#547e79','#a7b9a4','#c5c0a5','#946b48']);const ww=range(8,15);c.fillRect(408+j*18,y-range(25,48),ww,range(25,48));c.fillStyle='#e1d6b7';c.fillRect(409+j*18,y-16,ww-2,7);}}
 c.fillStyle='#382a20';c.fillRect(25,330,340,150);c.fillStyle='#b39269';c.fillRect(10,323,380,12);for(let j=0;j<6;j++){c.fillStyle='#f0dfb6';c.fillRect(45+j*47,300,20,23);c.fillStyle='#30241c';c.fillRect(48+j*47,297,15,4);}
 for(let j=0;j<3;j++){c.strokeStyle='#1d2523';c.lineWidth=3;c.beginPath();c.moveTo(75+j*110,0);c.lineTo(75+j*110,45);c.stroke();c.fillStyle='#ffe4af';c.beginPath();c.ellipse(75+j*110,52,25,8,0,0,Math.PI*2);c.fill();}
 const reflection=c.createLinearGradient(0,0,w,h);reflection.addColorStop(0,'#91bfcb18');reflection.addColorStop(.4,'#acd5db03');reflection.addColorStop(.5,'#bdd6df2c');reflection.addColorStop(.6,'#acd5db03');reflection.addColorStop(1,'#91bfcb15');c.fillStyle=reflection;c.fillRect(0,0,w,h);
}));
function shopFront(x,z,w,ry,index){
 const t=tenants[index%tenants.length];const local=(xx,zz)=>[x+Math.cos(ry)*xx+Math.sin(ry)*zz,z-Math.sin(ry)*xx+Math.cos(ry)*zz];
 const b=(xx,y,zz,ww,hh,dd,m)=>{const p=local(xx,zz);box(p[0],y,p[1],ww,hh,dd,m,ry);};
 b(0,2.1,0,w-.15,3.6,.18,dark);b(0,2.1,.12,w-.6,2.8,.05,emit(index%3?'#a98254':'#659396',.35));
 const interior=local(0,.17);panel(shopTextures[index%shopTextures.length],interior[0],2.05,interior[1],w-.6,2.85,ry,.85,false);
 for(let xx=-w/2+.5;xx<w/2;xx+=1.4){b(xx,2,.2,.08,3,.13,metal);b(xx,1.1,.25,.9,.15,.07,dark);for(let j=0;j<4;j++)b(xx-.4+j*.21,1.35,.25,.13,.36,.08,mat(pick(['#ba8a57','#c3bfa8','#6d8c85','#b35f4c'])));}
 b(0,3.9,.4,w+.15,.24,1.0,metal);b(0,3.72,.7,w,.05,.12,warm);b(0,.5,.8,w,.17,1.6,curb);
 const p=local(0,.55);label(t[0],t[1],p[0],4.65,p[1],w,.95,t[2],t[3],ry,false,1.2);
 if(index%3===0){const p=local(w*.35,.8);for(let y=1.1;y<3.5;y+=.7){instance(unitSphere,emit('#ff7140',1.1),p[0],y,p[1],.26,.31,.26);cylinder(p[0],y+.32,p[1],.12,.06,dark);cylinder(p[0],y-.32,p[1],.12,.06,dark);}}
 if(index%3===1){b(0,3.55,1.15,w,.13,1.8,mat('#8c4339'));for(let k=0;k<8;k++){const xx=-w/2+(k+.5)*w/8;b(xx,3.52,1.15,w/16,.15,1.8,mat('#b59b78'));}b(0,3.35,2,w,.35,.08,mat('#8c4339'));}
 if(index%2===0){const p=local(-w*.35,1.6);box(p[0],1,p[1],.72,1.3,.14,dark,ry);label('営業中','OPEN / MENU',p[0]+Math.sin(ry)*.09,1.1,p[1]+Math.cos(ry)*.09,.62,.88,t[2],t[3],ry);}
}
for(let bi=0;bi<16;bi++){const b=buildings[bi];for(let face=0;face<2;face++){const ry=face===0?(b.z<0?0:Math.PI):(b.x<0?Math.PI/2:-Math.PI/2);const along=face===0?b.w:b.d;const n=Math.floor(along/5.4),ww=along/n;for(let j=0;j<n;j++){let x=face===0?b.x-along/2+ww*(j+.5):b.x+(b.x<0?b.w/2:-b.w/2);let z=face===0?b.z+(b.z<0?b.d/2:-b.d/2):b.z-along/2+ww*(j+.5);shopFront(x,z,ww,ry,bi*3+j+face);}
 if(bi<8){for(let j=0;j<3;j++){let x=face===0?b.x-b.w*.32+j*b.w*.32:b.x+(b.x<0?b.w/2+.2:-b.w/2-.2);let z=face===0?b.z+b.d/2+.2:b.z-b.d*.3+j*b.d*.3;let t=tenants[(bi+j+4)%tenants.length];label(t[0],`${j+2}F / ${t[1]}`,x,7.2,z,face===0?b.w*.27:b.d*.27,1.25,t[2],t[3],ry,false,.85);}}
 }}

// Hero media facade; all graphics are original fictional campaigns.
const imageLoader=new THREE.TextureLoader();
const heroTexture=await imageLoader.loadAsync('./assets/after-hours.png');heroTexture.colorSpace=THREE.SRGBColorSpace;heroTexture.anisotropy=8;
panel(heroTexture,-34,25.3,-21.15,25,16.67,0,1.35);
label('SHIBUYA VISION','CULTURE NEVER SLEEPS',-34,36,-21.05,25,2.3,'#14272b','#d5eee7',0,false,1.6);
label('渋谷センター街','SHIBUYA CENTER-GAI',-34,13.8,-21.05,24,2.2,'#193f4a','#8af2ed');
label('夜を、歩こう。','THE CITY IS YOURS',-34,45.5,-21.05,24,4.4,'#d84624','#ffe5bd',0,false,1.4);
const orbArt=canvasTexture(768,1024,(c,w,h)=>{c.fillStyle='#0c1723';c.fillRect(0,0,w,h);let g=c.createRadialGradient(390,415,5,390,415,280);g.addColorStop(0,'#f4e3bb');g.addColorStop(.4,'#fa8c50');g.addColorStop(.74,'#db392a');g.addColorStop(1,'#321a32');c.fillStyle=g;c.beginPath();c.arc(390,415,280,0,Math.PI*2);c.fill();c.strokeStyle='#ffcf8d';c.lineWidth=2;for(let i=0;i<13;i++){c.beginPath();c.ellipse(390,415,300,40+i*16,-.45,0,Math.PI*2);c.stroke();}c.fillStyle='#fff1d2';c.textAlign='center';c.font='700 100px Arial';c.fillText('ORBIT',384,840);c.font='27px Arial';c.fillText('SOUND BEYOND THE CITY',384,904);c.font='24px Arial';c.fillText('03 NOV — 30 NOV / TOKYO',384,965);c.font='23px Arial';c.fillText('未来の音楽に、出会う。',384,70);});
panel(orbArt,34,26,-20.75,21,28,0,1.15);label('TOKYO  /  ORBIT','MUSIC • ART • NIGHT',34,43,-20.7,23,2.6,'#172733','#cbe5ec');
const waveArt=canvasTexture(1024,512,(c,w,h)=>{let g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#087489');g.addColorStop(1,'#0e1d39');c.fillStyle=g;c.fillRect(0,0,w,h);c.strokeStyle='#95e3d2';for(let j=0;j<35;j++){c.beginPath();for(let i=0;i<w;i+=3){let y=280+Math.sin(i*.007+j*.09)*110+j*5;c.lineTo(i,y);}c.stroke();}c.fillStyle='#f3f5da';c.font='bold 120px Arial';c.fillText('AQUA',60,170);c.font='40px sans-serif';c.fillText('深呼吸する、都市。',65,245);c.font='20px Arial';c.fillText('PURE / STILL / TOKYO',65,465);});
panel(waveArt,20.75,52,-34,23,11,-Math.PI/2,1.35);
panel(waveArt,-20.3,23,-68,20,10,Math.PI/2,1.2);
panel(orbArt,-20.25,28,-36,16,21,Math.PI/2,1.15);
label('音楽は、止まらない。','LISTEN / FEEL / REPEAT',20.7,24,-34,21,8,'#ad3e2f','#ffe4b4',-Math.PI/2,false,1.2);
label('東 京','THE FUTURE IS A FEELING',-64,27,-19.95,20,10,'#db4934','#fff0c7',0,false,1.3);
label('109','SHIBUYA / FASHION / CULTURE',-34,54,-35,15,6,'#182a34','#edf2e2',0,false,1.7);
label('MIDNIGHT','LISTEN TO THE CITY',64,32,-20.3,22,9,'#262342','#f3b0d1',0,false,1.2);
label('ホテル 夜景','HOTEL / CITY VIEW',-67,44,20.2,20,5,'#29464a','#def4e8',Math.PI);
label('渋谷駅','SHIBUYA STATION  →',37,12,22.8,25,3,'#15574b','#e6f2dc',Math.PI);
// Long vertical signs, projecting blades and stacked tenant directories.
for(let i=0;i<16;i++){const b=buildings[i];const ry=b.x<0?Math.PI/2:-Math.PI/2;const x=b.x+(b.x<0?b.w/2+.4:-b.w/2-.4);const z=b.z+(b.z<0?b.d*.36:-b.d*.36);const t=tenants[(i+2)%tenants.length];label(t[0],'24H OPEN',x,16,z,2.3,15,t[2],t[3],ry,true,1.3);if(i<8){const xx=b.x+b.w*.42,zz=b.z+b.d/2+.5;label(pick(['カラオケ','パチンコ','居酒屋','ゲーム']),'TOKYO',xx,23,zz,2,19,i%2?'#c13439':'#124b79','#fff2cf',0,true,1.8);for(let j=0;j<5;j++){const t=tenants[(i+j)%tenants.length];label(t[0],`${j+2}F`,b.x-b.w*.4,9+j*2.4,zz,3.2,1.8,t[2],t[3],0,false,1.15);}}}
// LED trim, screens' metal brackets and roof safety rails.
for(let bi=0;bi<16;bi++){const b=buildings[bi];const em=bi%3===0?cyan:bi%3===1?emit('#ff6644',1.8):warm;box(b.x,b.h+.9,b.z+b.d/2,b.w,.07,.07,em);for(let xx=-b.w/2;xx<=b.w/2;xx+=2.5)cylinder(b.x+xx,b.h+1.2,b.z+b.d/2,.035,1.3,metal);box(b.x,b.h+1.8,b.z+b.d/2,b.w,.04,.04,metal);if(bi<4){for(let y=12;y<b.h-2;y+=3){box(b.x-b.w/2-.3,y,b.z+b.d/2,1.2,.12,2.4,metal);box(b.x-b.w/2-.85,y+.5,b.z+b.d/2,.05,1,2.3,metal);}}}
// Projecting lightboxes and steel service balconies break up the regular facades.
for(let bi=0;bi<8;bi++){const b=buildings[bi],side=b.x<0?1:-1,x=b.x+side*(b.w/2+.6);for(let k=0;k<3;k++){const z=b.z-b.d*.32+k*b.d*.3;const t=tenants[(bi*2+k+1)%tenants.length];label(t[0],`${k+2}F / OPEN`,x,10+k*4,z,1.45,5.5,t[2],t[3],side*Math.PI/2,true,1.4);box(x-side*.3,12+k*4,z,.6,.09,.08,metal);}for(let y=9;y<b.h-3;y+=6){box(b.x-b.w*.3,y,b.z-b.d/2-.65,4,.15,1.5,metal);box(b.x-b.w*.3,y+.75,b.z-b.d/2-1.4,4,.055,.055,metal);for(let j=0;j<7;j++)cylinder(b.x-b.w*.3-1.8+j*.6,y+.4,b.z-b.d/2-1.4,.025,.8,metal);}cylinder(b.x+b.w*.35,b.h*.5,b.z-b.d/2-.35,.075,b.h-2,metal);}
// Remote signage gives the central canyon several illuminated depth layers.
for(let i=0;i<10;i++){const z=-100-i*10;const s=i%2?1:-1;label(pick(['渋谷','ホテル','居酒屋','夜景','東京']),'OPEN 24H',s*19.5,range(12,26),z,2.2,10,pick(['#873d2d','#184f6b','#4b365a']),'#e9e9c7',-s*Math.PI/2,true,1.2);}

// Infrastructure: pedestrian bridge over the eastern approach and station entry.
box(68,7.3,0,5,.65,39,concrete);for(let x of [65.6,70.4]){box(x,8,0,.12,1.35,39,glass);box(x,8.7,0,.1,.08,39,cyan);for(let z=-18;z<20;z+=2)box(x,8,z,.08,1.4,.08,metal);}for(let z of [-18,18]){box(68,3.7,z,.85,7.1,1.4,concrete);for(let j=0;j<22;j++)box(68,7.2-j*.3,z+(z<0?-1:1)*(j*.42),4.4,.3,.5,metal);}
label('渋谷駅  SHIBUYA','JR / METRO  →',65.45,7.4,0,14,1.1,'#164e43','#e6f4cd',-Math.PI/2);
// A small rail viaduct in the distance reinforces the layered city structure.
box(0,10,-118,195,.85,7,concrete);for(let x=-90;x<100;x+=18){box(x,5,-118,1.5,10,3,concrete);box(x,10.8,-114.7,17,.5,.2,metal);}box(0,11,-121,195,.2,.3,metal);
const train=new THREE.Group();scene.add(train);for(let i=0;i<5;i++){const body=new THREE.Mesh(new THREE.BoxGeometry(14,3.5,4),mat('#b1b5ac',.35,.6));body.position.set(i*14.8,12.5,-118);train.add(body);const stripe=new THREE.Mesh(new THREE.BoxGeometry(14,.5,4.05),mat('#75a667'));stripe.position.set(i*14.8,12,-118);train.add(stripe);for(let j=0;j<7;j++){const win=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.3,.05),warm);win.position.set(i*14.8-6+j*1.85,13,-115.95);train.add(win);}}

// Traffic signals, streetlamps, utility poles, tangled catenaries and street clutter.
const signalLights=[],pedestrianLights=[];
for(let sx of [-1,1])for(let sz of [-1,1]){
 const x=sx*18.3,z=sz*18.3;cylinder(x,3.5,z,.11,6.7,metal);box(x-sx*3.2,6.65,z,6.5,.12,.12,metal);
 box(x-sx*5.7,6.45,z,2.1,.65,.5,dark);
 for(let j=0;j<3;j++){const m=new THREE.Mesh(new THREE.SphereGeometry(.19,12,8),j===0?red:mat('#12292b'));m.position.set(x-sx*5.7+(j-1)*.61,6.46,z+.28);scene.add(m);signalLights.push({mesh:m,index:j,axis:0});}
 box(x,6.15,z-sz*3.2,.12,.12,6.5,metal);box(x,5.95,z-sz*5.7,.5,.65,2.1,dark);
 for(let j=0;j<3;j++){const m=new THREE.Mesh(new THREE.SphereGeometry(.19,12,8),j===0?red:mat('#12292b'));m.position.set(x+.28,5.96,z-sz*5.7+(j-1)*.61);scene.add(m);signalLights.push({mesh:m,index:j,axis:1});}
 label('中央通り','CHUO-DORI',x-sx*1.5,5.65,z+.12,2.5,.55,'#164d60','#d7efeb');
 box(x,2.5,z+.2,.55,.9,.32,dark);const ped=new THREE.Mesh(unitBox,emit('#5df2ab',1.6));ped.position.set(x,2.7,z+.38);ped.scale.set(.27,.27,.025);scene.add(ped);pedestrianLights.push(ped);
}
for(let s of [-1,1])for(let z=-100;z<=100;z+=24){let x=s*18.6;cylinder(x,4.7,z,.075,9,metal);box(x-s*1.6,9.1,z,3.4,.14,.18,metal);box(x-s*3.1,9,z,.9,.12,.5,warm);if(Math.abs(z)<60)point(x-s*3,8.7,z,'#ffd6a5',120,24);for(let k=0;k<3;k++){cylinder(x+s*.3,.9,z+2+k*1.6,.065,1.2,metal);box(x+s*.3,1.15,z+2.8+k*1.6,.07,.07,1.6,metal);}}
for(let s of [-1,1])for(let x=-90;x<=90;x+=27){let z=s*18.6;cylinder(x,4.4,z,.07,8.7,metal);box(x,8.7,z-s*1.5,.14,.14,3.1,metal);box(x,8.6,z-s*2.9,.65,.1,.8,warm);}
point(-26,17,-16,'#f87552',720,48);point(-15,9,-34,'#5bcee3',440,35);point(27,20,-14,'#fba65e',650,46);point(17,7,28,'#60dcb0',280,26);point(-30,6,18,'#ed7550',280,28);
for(let x of [-52,52])for(let z of [-51,49]){cylinder(x,7,z,.18,14,mat('#525151'));box(x,13,z,3.2,.18,.18,metal);for(let j=-1;j<=1;j++){cylinder(x+j,13.3,z,.16,.4,glass);const pts=[];for(let k=0;k<=24;k++){const f=k/24;pts.push([x+j,13-Math.sin(f*Math.PI)*2.3,z-72*f]);}line(pts,'#111e25');}for(let h=6;h<12;h+=.7)box(x+.2,h,z,.35,.06,.06,metal);}
for(let i=0;i<46;i++){const s=i%2?1:-1;const x=s*range(20.8,23),z=range(-95,95);if(Math.abs(z)<22)continue;
 if(i%3===0){box(x,1.5,z,1.1,2.4,.9,mat(i%2?'#b32f32':'#d8d9ca'));box(x,1.8,z+.46,.85,1.35,.035,emit('#badfe8',.8));for(let r=0;r<3;r++)for(let c=0;c<4;c++)box(x-.32+c*.21,1.4+r*.35,z+.49,.12,.23,.04,mat(pick(['#f2b45f','#ce5c46','#518f9d','#ded9c3'])));box(x,.65,z+.5,.7,.2,.04,dark);}
 else if(i%3===1){box(x,.85,z,.7,1.1,.7,metal);box(x,1.44,z,.75,.09,.75,dark);box(x,.9,z+.36,.4,.14,.02,dark);}
 else{box(x,.7,z,1.4,.15,.55,mat('#6d5140'));for(let dx of [-.5,.5])box(x+dx,.48,z,.08,.5,.45,metal);box(x,1,z-.3,1.4,.45,.08,mat('#6d5140'));}
}
// Bicycles use actual wheel rings and thin frame triangles.
const wheelGeo=new THREE.TorusGeometry(.35,.035,5,14);
for(let i=0;i<24;i++){let x=(i%2?1:-1)*range(21,23),z=range(-90,90);if(Math.abs(z)<24)continue;const paintBike=pick(['#659a9f','#a36748','#8d9591']);for(let dz of [-.52,.52]){instance(wheelGeo,rubber,x,.72,z+dz,1,1,1,Math.PI/2);cylinder(x,1.05,z+dz,.025,.7,metal);}line([[x,.72,z-.52],[x,1.35,z-.2],[x,.72,z+.52],[x,.72,z-.52],[x,1.35,z+.33],[x,1.35,z-.2]],paintBike);box(x,1.4,z-.2,.25,.08,.35,rubber);box(x,1.5,z+.5,.6,.05,.05,metal);}
// Service alleys between blocks: wet paving, fire doors, compressors, cable trays.
for(let s of [-1,1]){const x=s*50.5;box(x,.34,-65,3.4,.04,86,mat('#152831',.24,.35));for(let z=-25;z>-101;z-=8){box(x,.37,z,.4,.025,2.5,paint);cylinder(x+s*1.3,2.1,z,.045,3.5,metal);box(x+s*1.3,3.9,z,.35,.12,.8,warm);box(x-s*1.4,1.45,z+1,.15,2.2,.95,metal);box(x+s*1.35,3.2,z+3,.5,.9,1.3,metal);for(let j=0;j<7;j++)box(x+s*1.65,2.9+j*.09,z+3,.02,.03,1.1,dark);}label('路地裏','LATE NIGHT / BARS',x,4.2,-21.2,3.3,.8,'#6d3d2c','#f7d29b');}
// Street trees and planters soften the commercial grid without hiding its signage.
const leafMats=['#394b36','#62705a','#82733e','#4d6154'].map(c=>mat(c,.88,0));
for(let i=0;i<12;i++){const x=(i%2?1:-1)*19.6,z=-89+Math.floor(i/2)*31;if(Math.abs(z)<22)continue;box(x,.55,z,1.2,.45,1.2,concrete);box(x,.8,z,1,.08,1,mat('#242e26'));cylinder(x,2.5,z,.1,3.6,mat('#554b42'));for(let j=0;j<42;j++){const theta=random()*Math.PI*2,r=Math.sqrt(random())*1.1;instance(unitSphere,pick(leafMats),x+Math.cos(theta)*r,3.9+range(-.6,.8),z+Math.sin(theta)*r,range(.2,.5),range(.16,.4),range(.2,.5));}}

// Wisps of steam sit at ground level, backlit by the shops.
const mistTexture=canvasTexture(128,128,c=>{const g=c.createRadialGradient(64,64,3,64,64,64);g.addColorStop(0,'#c9e6e04a');g.addColorStop(.4,'#b4d5d025');g.addColorStop(1,'#adcbd000');c.fillStyle=g;c.fillRect(0,0,128,128);});
const steam=[];for(let i=0;i<24;i++){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:mistTexture,color:'#b6ccd0',transparent:true,opacity:.15,depthWrite:false}));m.position.set((i%2?1:-1)*range(17,24),range(.3,3),range(-65,50));m.scale.set(range(3,7),range(2,4),1);scene.add(m);steam.push({mesh:m,y:m.position.y,phase:random()*6});}

finishBatches();

// Moving crowds use shared instanced meshes: coats, heads, animated limbs and umbrellas.
const crowdCount=540;
const bodyMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.22,.28,.67,7),mat('#6b7a83'),crowdCount);
const headMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(.16,7,5),mat('#b19c8c'),crowdCount);
const hairMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(.169,8,5,0,Math.PI*2,0,Math.PI*.55),mat('#28262a'),crowdCount);
const legMesh=new THREE.InstancedMesh(unitBox,mat('#19252e'),crowdCount*2);
const armMesh=new THREE.InstancedMesh(unitCylinder,mat('#44525c'),crowdCount*2);
const handMesh=new THREE.InstancedMesh(unitSphere,mat('#a99582'),crowdCount*2);
const bagMesh=new THREE.InstancedMesh(roundedBody,mat('#463e36'),crowdCount);
const umbrellaGeometry=new THREE.SphereGeometry(.76,12,5,0,Math.PI*2,0,Math.PI*.39);
const umbrellas=new THREE.InstancedMesh(umbrellaGeometry,new THREE.MeshStandardMaterial({color:'#dddddd',roughness:.32,metalness:.15,side:THREE.DoubleSide}),crowdCount);
const shafts=new THREE.InstancedMesh(unitCylinder,metal,crowdCount);
const crowdMeshes=[bodyMesh,headMesh,hairMesh,legMesh,armMesh,handMesh,bagMesh,umbrellas,shafts];crowdMeshes.forEach(m=>{m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;scene.add(m);});
const coatColors=['#253c4d','#2e333f','#9e8e79','#555c63','#41464e','#334b4b','#745350','#b7b5a8'];
const umbrellaColors=['#5b8497','#294d62','#638d92','#998e80','#a34744','#c3ac81','#394856','#b4c9cd','#46595e'];
const crowd=[];
// Pedestrian phase lasts 24 seconds; four traffic approaches then run together.
const cycle=64;
for(let i=0;i<crowdCount;i++){
 const crossing=i<270;const route=i%6;let from,to;
 const offset=range(-1.6,1.6);
 if(crossing){const ends=[[-17,-14,17,-14],[-17,14,17,14],[-14,-17,-14,17],[14,-17,14,17],[-16,-16,16,16],[-16,16,16,-16]][route];from=new THREE.Vector2(ends[0]+offset,ends[1]+offset);to=new THREE.Vector2(ends[2]+offset,ends[3]+offset);if(i%4===0)[from,to]=[to,from];}
 else{const s=i%2?1:-1;const side=i%4<2;if(side){from=new THREE.Vector2(s*range(18.9,20.1),-97);to=new THREE.Vector2(from.x,97);}else{from=new THREE.Vector2(-97,s*range(18.9,20.1));to=new THREE.Vector2(97,from.y);}if(i%3===0)[from,to]=[to,from];}
 const person={from,to,crossing,speed:range(.75,1.35),offset:random(),height:range(.9,1.15),umbrella:random()>.12,phase:random()*6.28,queue:range(0,4)};crowd.push(person);
 bodyMesh.setColorAt(i,new THREE.Color(pick(coatColors)));armMesh.setColorAt(i*2,new THREE.Color(pick(coatColors)));armMesh.setColorAt(i*2+1,new THREE.Color(pick(coatColors)));umbrellas.setColorAt(i,new THREE.Color(pick(umbrellaColors)));
}
function setInstance(mesh,i,x,y,z,sx,sy,sz,ry=0,rx=0){dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
function updateCrowd(time){
 const phase=time%cycle;
 crowd.forEach((p,i)=>{let t,moving=true;
 if(p.crossing){const start=p.offset*6; t=clamp((phase-start)/17,0,1);moving=t>0&&t<1;if(Math.floor(time/cycle)%2===1)t=1-t;}else t=(p.offset+time*p.speed/194)%1;
 let x=THREE.MathUtils.lerp(p.from.x,p.to.x,t),z=THREE.MathUtils.lerp(p.from.y,p.to.y,t);const angle=Math.atan2(p.to.x-p.from.x,p.to.y-p.from.y)+(p.crossing&&Math.floor(time/cycle)%2?Math.PI:0);
 if(p.crossing){const edge=Math.pow(Math.abs(t-.5)*2,10)*p.queue;const dir=t<.5?-1:1;x+=Math.sin(Math.atan2(p.to.x-p.from.x,p.to.y-p.from.y))*edge*dir;z+=Math.cos(Math.atan2(p.to.x-p.from.x,p.to.y-p.from.y))*edge*dir;}
 const h=p.height;const gait=moving?Math.sin(time*7.5*p.speed+p.phase)*.42:0;const bob=moving?Math.abs(Math.sin(time*7.5+p.phase))*.035:0;const ground=p.crossing?.1:.4;
 setInstance(bodyMesh,i,x,ground+1.08*h+bob,z,h,h,h,angle);setInstance(headMesh,i,x,ground+1.57*h+bob,z,h,h,h);setInstance(hairMesh,i,x,ground+1.60*h+bob,z,h,h,h,angle);
 for(let side=0;side<2;side++){const s=side===0?-1:1;const dx=Math.cos(angle)*s*.12*h,dz=-Math.sin(angle)*s*.12*h;setInstance(legMesh,i*2+side,x+dx,ground+.42*h,z+dz,.14*h,.73*h,.16*h,angle,gait*s);setInstance(armMesh,i*2+side,x+dx*2.2,ground+1.02*h,z+dz*2.2,.075*h,.58*h,.075*h,angle,-gait*s*.65);setInstance(handMesh,i*2+side,x+dx*2.2+Math.sin(angle)*gait*s*.18,ground+.72*h,z+dz*2.2+Math.cos(angle)*gait*s*.18,.065*h,.08*h,.065*h);}
 const bag=i%3===0?1:0;setInstance(bagMesh,i,x+Math.cos(angle)*.31,ground+.67*h,z-Math.sin(angle)*.31,.13*bag,.38*bag,.3*bag,angle);
 const u=p.umbrella?1:0;setInstance(umbrellas,i,x+.1,ground+1.87*h+bob,z,h*u,h*.48*u,h*u,angle);setInstance(shafts,i,x+.1,ground+1.55*h,z,.012*u,1.3*h*u,.012*u);
 });crowdMeshes.forEach(m=>m.instanceMatrix.needsUpdate=true);
}

// Vehicle geometry: wheel arches, glazing, roof signs, lamps and a distinct bus silhouette.
const vehicles=[];
function car(index){const g=new THREE.Group();const bus=index%13===0;const taxi=index%3===0&&!bus;const len=bus?9.2:4.6;const bodyMat=mat(bus?'#abb7ac':taxi?'#a7ad72':pick(['#a8b4b3','#2e3f4b','#6f7373','#9f3d36','#c0c0ac']),.26,.55);
 const part=(x,y,z,w,h,d,m)=>{const geometry=m===glass&&!bus?carCabin:m===bodyMat&&h>.4?roundedBody:unitBox;const o=new THREE.Mesh(geometry,m);o.position.set(x,y,z);o.scale.set(w,h,d);g.add(o);return o;};
 part(0,.73,0,bus?2.5:1.9,.8,len,bodyMat);part(0,bus?1.85:1.35,bus?0:-.2,bus?2.4:1.65,bus?1.65:.78,bus?8.7:2.45,glass);part(0,bus?2.77:1.76,bus?0:-.25,bus?2.5:1.72,.13,bus?9:2.5,bodyMat);
 part(0,.4,0,1.75,.18,len-.3,rubber);for(let side of [-1,1]){for(let z of [-len*.32,len*.32]){const wh=new THREE.Mesh(new THREE.CylinderGeometry(bus?.48:.34,bus?.48:.34,.19,12),rubber);wh.rotation.z=Math.PI/2;wh.position.set(side*(bus?1.25:.96),.43,z);g.add(wh);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.2,8),metal);hub.rotation.z=Math.PI/2;hub.position.copy(wh.position);g.add(hub);}part(side*(bus?1.22:.84),1.4,-.22,.06,bus?1.7:.7,.08,bodyMat);part(side*.71,.85,len/2+.015,.4,.16,.03,white);part(side*.71,.85,-len/2-.015,.38,.18,.03,red);part(side*1.04,1.23,.7,.18,.12,.28,bodyMat);}
 part(0,.57,len/2+.03,.65,.17,.03,mat('#ded8b0'));if(taxi){part(0,1.94,-.1,.65,.25,.35,warm);part(0,.9,len/2+.025,.52,.28,.035,mat('#426348'));}if(bus){for(let j=-3;j<=3;j++){part(0,1.9,j*1.2,2.45,.08,.08,bodyMat);part(0,2.2,j*1.2,2.45,1.1,.07,bodyMat);}part(0,1,0,2.53,.3,9.1,mat('#6b9e7b'));part(0,2.4,len/2+.02,1.75,.4,.03,warm);}
 // Headlight spill is a soft additive road decal rather than an expensive light per car.
 const tex=canvasTexture(64,128,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#ceebf255');g.addColorStop(1,'#b6deee00');c.fillStyle=g;c.beginPath();c.moveTo(w*.3,0);c.lineTo(w*.7,0);c.lineTo(w,h);c.lineTo(0,h);c.fill();});
 const pool=new THREE.Mesh(new THREE.PlaneGeometry(4.5,9),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.4,depthWrite:false,blending:THREE.AdditiveBlending}));pool.rotation.x=-Math.PI/2;pool.position.set(0,.08,len/2+4);g.add(pool);
 scene.add(g);return {group:g,bus,len,axis:index%2,dir:index%4<2?1:-1,lane:Math.floor(index/4)%2,slot:Math.floor(index/8),speed:range(7.5,10),initial:range(25,160)};
}
for(let i=0;i<48;i++)vehicles.push(car(i));
function updateVehicles(time,dt){const phase=time%cycle;const northSouth=phase>26&&phase<38,eastWest=phase>45&&phase<57;
 for(let axis=0;axis<2;axis++)for(let dir of [-1,1])for(let lane=0;lane<2;lane++){const group=vehicles.filter(v=>v.axis===axis&&v.dir===dir&&v.lane===lane);group.forEach(v=>{if(v.travel===undefined)v.travel=-28-v.slot*22;});group.sort((a,b)=>b.travel-a.travel);let leader=null;
 for(const v of group){const green=axis===0?northSouth:eastWest;let next=v.travel+v.speed*dt;if(!green&&v.travel<=-22-v.len/2)next=Math.min(next,-23-v.len/2);if(leader)next=Math.min(next,leader.travel-(leader.len+v.len)/2-2.1);v.travel=next;leader=v;
 const lanePosition=(v.lane?10.4:6.2)*-v.dir;const a=v.travel*v.dir;v.group.position.set(v.axis===0?lanePosition:a,0,v.axis===0?a:lanePosition);v.group.rotation.y=v.axis===0?(v.dir>0?0:Math.PI):(v.dir>0?Math.PI/2:-Math.PI/2);}
 group.forEach(v=>{if(v.travel>170)v.travel=-170;});}
 signalLights.forEach(s=>{const green=s.axis===0?northSouth:eastWest;s.mesh.material=s.index===(green?2:0)?(green?emit('#5ff2c5',2):red):mat('#152a2f');});pedestrianLights.forEach(p=>p.material=phase<24?emit('#5df2ab',1.6):red);}

// Rain is GPU-animated; both endpoints wrap together, avoiding long reset streaks.
const rainCount=12000,rainPos=new Float32Array(rainCount*6),rainSeed=new Float32Array(rainCount*2),rainTip=new Float32Array(rainCount*2);
for(let i=0;i<rainCount;i++){const x=range(-120,120),y=range(0,80),z=range(-140,110);rainPos.set([x,y,z,x,y,z],i*6);rainSeed[i*2]=rainSeed[i*2+1]=random();rainTip[i*2+1]=1;}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));rainGeo.setAttribute('seed',new THREE.BufferAttribute(rainSeed,1));rainGeo.setAttribute('tip',new THREE.BufferAttribute(rainTip,1));
const rainMat=new THREE.ShaderMaterial({uniforms:{time:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`attribute float seed;attribute float tip;uniform float time;varying float alpha;void main(){vec3 p=position;float fall=mod(time*(18.+seed*8.),80.);p.y=mod(p.y-fall+80.,80.)-tip*.62;p.x+=sin(time*.1+seed*6.)*.3-tip*.09;vec4 mv=modelViewMatrix*vec4(p,1.);alpha=(.025+seed*.045)*clamp(1.+mv.z/160.,0.,1.);gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying float alpha;void main(){gl_FragColor=vec4(.55,.75,.86,alpha);}`});
const rain=new THREE.LineSegments(rainGeo,rainMat);rain.frustumCulled=false;scene.add(rain);

let paused=matchMedia('(prefers-reduced-motion: reduce)').matches,raining=true,touring=false,highQuality=true,uiHidden=false,simTime=5,transition=null;
const views={crossing:{pos:[11,19,58],target:[-5,18,-18]},street:{pos:[5,3.2,29],target:[-16,16,-28]},aerial:{pos:[12,112,85],target:[0,0,-12]}};
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.style.opacity=1;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.style.opacity=0,2400);}
function setView(name){const v=views[name];if(!v)return;transition={start:performance.now(),from:camera.position.clone(),to:new THREE.Vector3(...v.pos),targetFrom:controls.target.clone(),targetTo:new THREE.Vector3(...v.target)};const captions={crossing:'<span>01</span> 夜の交差点 · THE SCRAMBLE',street:'<span>02</span> 街の鼓動 · STREET LEVEL',aerial:'<span>03</span> 都市の輪郭 · ABOVE THE CITY'};document.querySelector('.eyebrow').innerHTML=captions[name];document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===name);b.setAttribute('aria-pressed',String(b.dataset.view===name));});}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{touring=false;document.querySelector('#tour').setAttribute('aria-pressed','false');setView(b.dataset.view);});
function toggleUI(){uiHidden=!uiHidden;document.querySelector('#interface').classList.toggle('hidden',uiHidden);document.querySelector('#show-ui').style.display=uiHidden?'block':'none';}
document.querySelector('#hide-ui').onclick=toggleUI;document.querySelector('#show-ui').onclick=toggleUI;
function togglePause(){paused=!paused;document.querySelector('#pause').textContent=paused?'▶':'Ⅱ';document.querySelector('#pause').setAttribute('aria-pressed',String(paused));toast(paused?'城市时间已暂停':'城市时间继续');}
document.querySelector('#pause').onclick=togglePause;
function toggleRain(){raining=!raining;rain.visible=raining;document.querySelector('#rain').setAttribute('aria-pressed',String(raining));document.querySelector('#city-status').textContent=raining?'23:48 · 小雨 · 17°C':'23:48 · 雨后 · 17°C';}
document.querySelector('#rain').onclick=toggleRain;
function toggleTour(){touring=!touring;transition=null;document.querySelector('#tour').setAttribute('aria-pressed',String(touring));toast(touring?'自动巡游已开启 · 拖动可退出':'已退出自动巡游');}
document.querySelector('#tour').onclick=toggleTour;
controls.addEventListener('start',()=>{transition=null;touring=false;document.querySelector('#tour').setAttribute('aria-pressed','false');});
document.querySelector('#quality').onclick=()=>{highQuality=!highQuality;renderer.setPixelRatio(Math.min(devicePixelRatio,highQuality?1.6:1));composer.setPixelRatio(renderer.getPixelRatio());bloom.enabled=highQuality;road.getRenderTarget().setSize(highQuality?1536:768,highQuality?1536:768);document.querySelector('#quality').textContent=highQuality?'高画质':'流畅';toast(highQuality?'高画质 · 光晕与精细反射':'流畅模式 · 降低渲染负载');};
function capture(){composer.render();renderer.domElement.toBlob(blob=>{if(!blob){toast('截图失败，请重试');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='shibuya-after-hours.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('已保存无界面的场景截图');});}
document.querySelector('#capture').onclick=capture;
document.querySelector('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('当前窗口不支持全屏');}};
addEventListener('keydown',e=>{if(e.target instanceof HTMLButtonElement&&e.code==='Space')return;if(e.code==='Space'){e.preventDefault();togglePause();}if(e.key.toLowerCase()==='h')toggleUI();if(e.key.toLowerCase()==='r')toggleRain();if(e.key.toLowerCase()==='t')toggleTour();if(e.key.toLowerCase()==='p')capture();if(['1','2','3'].includes(e.key))setView(['crossing','street','aerial'][Number(e.key)-1]);});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('图形上下文中断，请刷新恢复场景');});
let last=performance.now(),frames=0,elapsed=0;
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.07);last=now;if(!paused)simTime+=dt;
 if(transition){const t=clamp((now-transition.start)/2300,0,1),ease=t*t*(3-2*t);camera.position.lerpVectors(transition.from,transition.to,ease);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,ease);if(t===1)transition=null;}
 if(touring){const angle=now*.00005;camera.position.set(Math.sin(angle)*12,10+Math.sin(angle*.6)*6,44+Math.cos(angle)*10);controls.target.set(Math.sin(angle*.7)*10,18,-24);}
 controls.update();camera.position.y=Math.max(camera.position.y,1.6);
 // Keep exploration outside solid facades, including during camera transitions.
 for(const b of buildings){const p=camera.position,dx=b.w/2+.8,dz=b.d/2+.8;if(p.y<b.h+1&&Math.abs(p.x-b.x)<dx&&Math.abs(p.z-b.z)<dz){const options=[{axis:'x',value:b.x-dx,dist:p.x-(b.x-dx)},{axis:'x',value:b.x+dx,dist:b.x+dx-p.x},{axis:'z',value:b.z-dz,dist:p.z-(b.z-dz)},{axis:'z',value:b.z+dz,dist:b.z+dz-p.z},{axis:'y',value:b.h+1,dist:b.h+1-p.y}];options.sort((a,b)=>a.dist-b.dist);p[options[0].axis]=options[0].value;}}
 updateCrowd(simTime);updateVehicles(simTime,paused?0:dt);rainMat.uniforms.time.value=simTime;road.material.uniforms.time.value=simTime;grade.uniforms.time.value=simTime;train.position.x=(simTime*7)%260-150;
 steam.forEach(s=>{s.mesh.position.y=s.y+Math.sin(simTime*.4+s.phase)*.6;s.mesh.material.opacity=.12+Math.sin(simTime*.3+s.phase)*.035;});
 composer.render();frames++;elapsed+=dt;if(elapsed>2){window.cityStats={fps:Math.round(frames/elapsed),people:crowdCount,vehicles:vehicles.length,buildings:buildings.length};frames=0;elapsed=0;}
}
updateCrowd(simTime);updateVehicles(simTime,0);controls.update();composer.render();
document.querySelector('#loading').style.opacity=0;setTimeout(()=>document.querySelector('#loading').remove(),1100);
if(paused){document.querySelector('#pause').textContent='▶';document.querySelector('#pause').setAttribute('aria-pressed','true');}
window.sceneAPI={scene,camera,renderer,controls,composer,setView,get time(){return simTime;},get paused(){return paused;},get raining(){return raining;},get touring(){return touring;},get highQuality(){return highQuality;}};
requestAnimationFrame(animate);
