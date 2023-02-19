const fs = require('fs')
const path = require("path")

const { pm } = require('../SV_dex');

const regional_id = 'SV - Regional Dex Numbers.txt';

let raw;
raw = fs.readFileSync(path.join(__dirname, regional_id), "utf8");
const _regional = raw.replaceAll('\r', '').split('\n');

const regional = _regional.map(l => {
    if (l[0] != '#') { throw "Error"; }
    const name = l.substring(5);
    const p = pm().find(pm => pm.name['eng'] == name);
    if (!p) { throw "Not found:" + l[1] }
    const id = parseInt(l.substring(1, 4));
    return `${p.national_id}\t${id}`;
});


fs.writeFileSync(path.join(__dirname, "SV_pm_regional_id.txt"), regional.join('\n'));