const { Dex, pm_data, move_data, type_data, ability_data } = require('../SV_dex');

const fs = require('fs')
const path = require("path")

// From sheet like:
//#1009 Walking Wake|Water/Dragon|Protosynthesis|99/83/91/125/83/109
//Leer @ Lv. —
// ...


let raw;
raw = fs.readFileSync(path.join(__dirname, "../1010.txt"), "utf8");
const x = raw.split('\n').map(l => l.split('@').map(i => i.trim()))
const line = x[0][0].split('|');
const id = line[0].match('[0-9]+');
const types = line[1].split('/');
const abs = line[2].split('/').map(ab => ability_data.find(a => a.name.eng == ab).id);
const stats = line[3];
// base: nantional	form	internal	type/Fire	ab	stat
const pm_base = `${id}\t0\t?\t${types.join('/')}\t${abs.join('/')}\t${stats}`;
console.log(pm_base)
const moves = x.filter(l => l.length == 2).map(l => {
    const move = move_data.find(d => d.name.eng == l[0]);
    if (move) {
        return `${move.id}|${l[1].replace("Lv. —", "Lv. 1")}`;
    } else {
        throw `${l[0]} @ ${l[1]}`
    }
}).join('\t')

console.log(`${id}\t0\t${moves}`)