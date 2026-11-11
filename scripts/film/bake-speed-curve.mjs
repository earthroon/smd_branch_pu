import {writeFileSync} from 'node:fs';
// Quintic smoothstep velocity and its integral. End acceleration/jerk are zero.
const samples=Array.from({length:97},(_,i)=>{const t=i/96;return {t,blend:6*t**5-15*t**4+10*t**3,integral:t**6-3*t**5+2.5*t**4};});
writeFileSync('app/data/home-film-speed.json',JSON.stringify({revision:'FILM-SPEED-R3',base:193.2,hoverRates:[0],enterMs:600,leaveMs:1400,startMs:1100,samples},null,2)+'\n');
