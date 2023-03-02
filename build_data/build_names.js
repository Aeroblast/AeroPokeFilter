const fs = require('fs')
const path = require("path")

const internal_id = "sv-internal-id.txt";
const national_id = "national-dex-name-1008.txt"
const national_id_CHT = "national-dex-name-1008-CHT.txt"

const loadRaw = (file) => fs.readFileSync(path.join(__dirname, '../raw', file), "utf8").replaceAll('\r', '');
let raw;
raw = loadRaw(internal_id);
const id_CHS = raw.split('\n').map(l => l.split('\t'))
raw = loadRaw(national_id);
const natinal_id_name = raw.split('\n').map(l => l.split('\t'));
raw = loadRaw(national_id_CHT);
const natinal_id_name_CHT = raw.split('\n').map(l => l.split('\t'));

const names = id_CHS.map(x => {

    let internal = x[0];
    let chs = x[1];
    let line = natinal_id_name.find(y => y[1] == chs);
    let national = line[0];
    let jpn = line[2];
    let eng = line[3];
    let line2 = natinal_id_name_CHT.find(y => parseInt(y[0]) == parseInt(national));
    national = line2[0];
    let cht = line2[1];

    return [national, internal, chs, cht, jpn, eng].join('\t');
});
names.sort();

const national = natinal_id_name.map(l => {

    let n = l[0];
    let chs = l[1];
    let jpn = l[2];
    let eng = l[3];
    let l2 = natinal_id_name_CHT.find(y => parseInt(y[0]) == parseInt(n));
    let cht = l2[1];

    return [n, chs, cht, jpn, eng].join('\t');
})

fs.writeFileSync(path.join(__dirname, "SV_pm_names_id.txt"), names.join('\n'));
fs.writeFileSync(path.join(__dirname, "pm_names.txt"), national.join('\n'));

/// Moves
const moves_all = 'move-names-895.txt';
const _zmoves = 'z-moves.txt';
const _sv_moves = 'SV - Move Names.txt';
raw = loadRaw(moves_all);
const moves = raw.split('\n').map(l => l.split('\t'));
raw = loadRaw(_zmoves);
const zmoves = raw.split('\n').map(l => l.split('\t'));
raw = loadRaw(_sv_moves);
const sv_moves = raw.replaceAll('’', "'").split('\n').map(l => l.split(':').map(x => x.trim()));

// bulbpedia 782 mistake id.
// SV : 875: Pound 876: Pound 
// 896+: 天星队车 
const sv_move_names = sv_moves.map(x => {
    const id = parseInt(x[0]);
    if (id == 0 || id == 875 || id == 876 || id >= 896) return null;
    const tags = [];
    let names = moves.find(y => parseInt(y[0]) == id);
    if (!names) {
        names = zmoves.find(y => y[0].indexOf("" + id) % 4 == 0);
        tags.push("z-move")
    }
    if (!names) { throw id; }
    if (names[1] != x[1]) { throw x[1] }
    const jpn = names[2];
    const ch = names[10].split(' / ');
    if (ch[0].indexOf('/') >= 0) { throw "ch" };
    const cht = ch[0];
    const chs = ch.length == 2 ? ch[1] : ch[0];

    //id, chs, cht, jpn, eng
    return [id, chs, cht, jpn, x[1], tags.join('|')].join('\t');

}).filter(x => x);
fs.writeFileSync(path.join(__dirname, "SV_move_names.txt"), sv_move_names.join('\n'));



/// Ability
const abilities_all = 'ability-names-298.txt';
const _sv_abilities = 'SV - Ability Names.txt';
raw = loadRaw(abilities_all);
const abilities = raw.split('\n').map(l => l.split('\t'));
raw = loadRaw(_sv_abilities);
const sv_abilities = raw.replaceAll('’', "'").split('\n').map(l => l.split(':').map(x => x.trim()));


const sv_ability_names = sv_abilities.map(x => {
    const id = parseInt(x[0]);
    if (id == 0) return null;
    const tags = [];
    let names = abilities.find(y => parseInt(y[0]) == id);
    if (!names) { throw id; }
    if (names[1] != x[1]) { throw x[1] }
    const jpn = names[2];
    const ch = names[10].split(' / ');
    if (ch[0].indexOf('/') >= 0) { throw "ch" };
    const cht = ch[0];
    const chs = ch.length == 2 ? ch[1] : ch[0];

    //id, chs, cht, jpn, eng
    return [id, chs, cht, jpn, x[1], tags.join('|')].join('\t');

}).filter(x => x);
fs.writeFileSync(path.join(__dirname, "SV_ability_names.txt"), sv_ability_names.join('\n'));