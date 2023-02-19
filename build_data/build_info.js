const fs = require('fs')
const path = require("path")



const path_list = `
SV - Pokémon Information (1.0.1) (Part 1).txt
SV - Pokémon Information (1.0.1) (Part 2).txt
`.trim().split('\n');

function ParseSheet(path) {
    const raw = fs.readFileSync(path, "utf8").replaceAll('\r', '').replaceAll('’', "'");
    const infos = raw.split('\n\n');
    return infos.map(x => ParseInfo(x));


}

function ParseInfo(info) {
    const lines = info.split('\n')
    let temp;
    let mode = 0;
    let index = 0;
    let evo_temp = {}
    for (const line of lines) {
        if (line.length == 0) {
            throw "emtry line";
        }
        if (mode == 0) {
            let parts = line.split(' - ');
            let stats = parts[1].split(' ')[0].split('/')
                .map(x => parseInt(x));
            temp = {
                raw_key: parts[0],
                types: parts[2].split('/'),
                abilities: parts[3].split('/'),
                moves: [],
                evolutions: [],
            };
            [..."HABCDS"].forEach((c, i) => temp[c] = stats[i]);
            mode = 1;
            continue;
        }
        if (mode != 0 && line[0] != " ") {
            if (["Evolutions:", "Learned Moves:", "Reminder Moves:", "Egg Moves:", "TM Moves:"].indexOf(line) >= 0) {
                mode = line;
                index = 0;
                if (line == "Evolutions:") {
                    evo_temp = {};
                    temp.evolutions.push(evo_temp);
                }
            } else {
                throw "unknown entry: " + line;
            }
            continue;
        }
        if (line[0] == " ") {
            switch (mode) {
                case "Learned Moves:":
                    {
                        const s = line.split('@').map(x => x.trim())
                        temp.moves.push({ name: s[0], condition: s[1] });
                    }
                    break;
                case "Egg Moves:":
                case "TM Moves:":
                case "Reminder Moves:":
                    {
                        const cond = mode.split(' ')[0];
                        const s = line.split(',').map(x => x.trim())
                        s.forEach(x => temp.moves.push({ name: x, condition: cond }))
                    }
                    break;

                case "Evolutions:":
                    {
                        let test = line.match(/^[ ]{4}([0-9]):$/) //Max is 7, for Eevee
                        if (test) {
                            index = parseInt(test[1]);
                            if (index != 0) {
                                evo_temp = {};
                                temp.evolutions.push(evo_temp);
                            }
                            break;
                        }
                        let s = line.split(':').map(s => s.trim());
                        evo_temp[s[0].toLowerCase()] = s[1];
                    }
                    break;

            }

            continue;
        }
    }

    return temp;
}


const r = path_list
    .map(x => ParseSheet(path.join(__dirname, x)));
const data = r[0].concat(r[1])

let raw;
raw = fs.readFileSync(path.join(__dirname, "SV_move_names.txt"), "utf8");
const SV_move_names = raw.split('\n').map(l => l.split('\t'))
raw = fs.readFileSync(path.join(__dirname, "SV_pm_names_id.txt"), "utf8");
const SV_pm_names_id = raw.split('\n').map(l => l.split('\t'));
raw = fs.readFileSync(path.join(__dirname, "SV_ability_names.txt"), "utf8");
const SV_ability_names = raw.split('\n').map(l => l.split('\t'));

data.forEach(pm => {
    const test = pm.raw_key.match(/-([0-9]{1,2})$/);
    let name = pm.raw_key;
    let form = 0;
    if (test) {
        name = name.substring(0, name.length - test[0].length);
        form = parseInt(test[1]);
    }
    let names = SV_pm_names_id.find(l => l[5] == name);
    if (names == null) { throw name; }
    pm.sv_internal_id = names[1];
    pm.national_id = names[0];
    pm.form = form;

    pm.abilities = pm.abilities.map(a => SV_ability_names.find(line => line[4] == a)[0]);

    pm.moves.forEach(move => move.id = SV_move_names.find(line => line[4] == move.name)[0])
    pm.evolutions.forEach(e => e.species = SV_pm_names_id.find(line => line[5] == e.species)[0])
})




const pm_base = data.map(pm =>
    `${pm.national_id}\t${pm.form}\t${pm.sv_internal_id}\t${pm.types.join('/')}\t${pm.abilities.join('/')}\t${[..."HABCDS"].map(k => pm[k]).join('/')}`
);

const pm_evo = data.map(pm => {
    let temp = pm.evolutions.map(e =>
        "level condition parameters species form".split(' ').map(k => e[k]).join('|')
    ).join('\t');
    if (temp) { return `${pm.national_id}\t${pm.form}\t${temp}` }
    return null;
}).filter(x => x);


const pm_moves = data.map(pm =>
    `${pm.national_id}\t${pm.form}\t${pm.moves.map(move => `${move.id}|${move.condition}`).join('\t')}`
);
fs.writeFileSync(path.join(__dirname, "SV_pm_moves.txt"), pm_moves.join('\n'));
fs.writeFileSync(path.join(__dirname, "SV_pm_evo.txt"), pm_evo.join('\n'));
fs.writeFileSync(path.join(__dirname, "SV_pm_base.txt"), pm_base.join('\n'));


const pm_names = SV_pm_names_id.map(l => [0, 2, 3, 4, 5].map(i => l[i]).join('\t'));
fs.writeFileSync(path.join(__dirname, "SV_pm_names.txt"), pm_names.join('\n'));
//fs.writeFileSync(path.join(__dirname, "SV_pm_info.json"), JSON.stringify(data, null, 2));
