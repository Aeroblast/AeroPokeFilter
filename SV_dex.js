const fs = require('fs')
const path = require("path")

let raw;
raw = fs.readFileSync(path.join(__dirname, "data/SV_move_names.txt"), "utf8");
/** id, chs, cht, jpn, eng */
const SV_move_names = raw.split('\n').map(l => l.split('\t'))

raw = fs.readFileSync(path.join(__dirname, "data/SV_pm_names.txt"), "utf8");
/** national id, chs, cht, jpn, eng */
const SV_pm_names = raw.split('\n').map(l => l.split('\t'));

raw = fs.readFileSync(path.join(__dirname, "data/SV_ability_names.txt"), "utf8");
/** id, chs, cht, jpn, eng */
const SV_ability_names = raw.split('\n').map(l => l.split('\t'));

raw = fs.readFileSync(path.join(__dirname, "data/SV_pm_base.txt"), "utf8");
/** national id, form, internal_id, types, abilities, stats*/
const SV_pm_base = raw.split('\n').map(l => l.split('\t'));

raw = fs.readFileSync(path.join(__dirname, "data/SV_pm_evo.txt"), "utf8");
/** national id, form, list of level|condition|parameters|species|form  */
const SV_pm_evo = raw.split('\n').map(l => l.split('\t'));

raw = fs.readFileSync(path.join(__dirname, "data/SV_pm_moves.txt"), "utf8");
/** national id, form, list of id|condition */
const SV_pm_moves = raw.split('\n').map(l => l.split('\t'));

raw = fs.readFileSync(path.join(__dirname, "data/type_names.txt"), "utf8");
/**  CHS/alter JPN/alter English*/
const type_names = raw.split('\n').map(l => l.split('\t'));

raw = fs.readFileSync(path.join(__dirname, "data/SV_pm_regional_id.txt"), "utf8");
/**  national palida*/
const SV_pm_regional_id = raw.split('\n').map(l => l.split('\t').map(n => parseInt(n)));

const type_data = type_names.map(l => {
    const chs = l[0].split('/');
    const jpn = l[2].split('/');
    const obj = {
        chs: chs[0],
        cht: l[1],
        jpn: jpn[0],
        jpn_alter: jpn[1],
        eng: l[3]
    }
    if (chs.length > 1) { obj.chs_alter = chs[1]; }
    return obj;
})

const move_data = SV_move_names.map(l => {
    const t = { id: parseInt(l[0]) };
    t.name = {};
    let i = 0;
    "chs cht jpn eng".split(' ').forEach(
        k => { i++; t.name[k] = l[i]; }
    )
    return t;
})

const ability_data = SV_ability_names.map(l => {
    const t = { id: parseInt(l[0]) };
    t.name = {};
    "chs cht jpn eng".split(' ').forEach(
        (k, i) => { t.name[k] = l[i + 1]; }
    )
    return t;
})

function data_filter_id_form(id, form) {
    return l => parseInt(l[0]) == parseInt(id) && parseInt(l[1]) == parseInt(form)
}

const pm_data = SV_pm_base.map(l => {
    const t = {};
    "national_id form internal_id types abilities stats".split(' ').forEach((k, i) => t[k] = l[i]);
    t.national_id = parseInt(t.national_id);
    t.form = parseInt(t.form);
    t.internal_id = parseInt(t.internal_id);
    t.types = t.types.split('/');
    t.abilities = t.abilities.split('/').map(id => parseInt(id))
        .map(id => ability_data.find(a => a.id == id));
    const stats = t.stats.split('/').map(v => parseInt(v));
    [..."HABCDS"].forEach((k, i) => t[k] = stats[i]);
    const this_id_form_filter = data_filter_id_form(t.national_id, t.form);
    const this_id_filter = l => l[0] == t.national_id;
    const moves = SV_pm_moves.find(this_id_form_filter);
    t.moves = [];
    moves.forEach((m, i) => {
        if (i < 2) return;//for id form
        const ps = m.split('|');
        const move_id = parseInt(ps[0]);
        t.moves.push({ ref: move_data.find(d => d.id == move_id), condition: ps[1] })
    })
    const names = SV_pm_names.find(this_id_filter)
    t.name = {};
    "chs cht jpn eng".split(' ').forEach(
        (k, i) => { t.name[k] = names[i + 1]; }
    )
    const evo = SV_pm_evo.find(this_id_form_filter);
    if (evo) {
        t.evolutions = [];
        evo.forEach((e, i) => {
            if (i < 2) return;
            const ps = e.split('|');
            const evo = {};
            "level|condition|parameters|species|form".split('|').forEach((k, i) => evo[k] = ps[i]);
            t.evolutions.push(evo);
        })
    } else {
        t.evolutions = null;
    }
    const regional_id = SV_pm_regional_id.find(l => l[0] == t.national_id);
    t.paldea_id = regional_id ? regional_id[1] : null;
    return t;
})

pm_data.forEach(pm => {
    if (pm.evolutions) {
        pm.evolutions.forEach(evo => {
            "level|species|form".split('|').forEach(v => evo[v] = parseInt(evo[v]));
            evo.ref = pm_data.find(pm => pm.national_id == evo.species && pm.form == evo.form)
            if (!evo.ref) throw "Evolution target not found: " + evo.species;
        });
    }
});

function copy_evo_move(pm) {
    if (pm.evolutions) {
        pm.evolutions.forEach(evo => {
            if (evo.ref.moves.find(mc => mc.condition == "Egg")) {
                // already copied.
                return;
            }
            pm.moves.filter(mc => mc.condition == "Egg")
                .forEach(mc => evo.ref.moves.push(mc));
            pm.moves
                .filter(mc => !evo.ref.moves.find(mc2 => mc2.ref == mc.ref))
                .forEach(mc => {
                    //pre evo only moves
                    //console.log(`${pm.name["chs"]} -> ${evo.ref.name["chs"]} ${mc.ref.name['chs']}`)
                    evo.ref.moves.push({ ref: mc.ref, condition: "PreEvo" });
                });
            copy_evo_move(evo.ref)
        });
    }
}

pm_data.forEach(copy_evo_move);

pm_data.sort((pm1, pm2) => pm1.national_id - pm2.national_id)

function pm_stats_string(pm) {
    let total = 0;

    return [..."HABCDS"].map(k => {
        total += pm[k];
        return ("" + pm[k]).padStart(3);
    }).join(" ") + ` = ${total}`
}

function pm_summary(pm, lang = "chs", highlight_moves = null) {
    const id_padded = (pm.national_id + "").padStart(3, '0');
    const name_str = `${pm.name[lang]}${pm.form != 0 ? ` (${pm.form})` : ""}`;
    const type_str = Array.from(new Set(pm.types)).map(t => type_name2obj(t)[lang]).join("/")
    let r = `#${id_padded} ${name_str} ${type_str}
    ${Array.from(new Set(pm.abilities)).map(a => a.name[lang]).join("/")}
    ${pm_stats_string(pm)}`;
    if (highlight_moves) {
        let move_r;
        switch (typeof (highlight_moves)) {
            case "object":
                switch (typeof (highlight_moves[0])) {
                    case "object":
                        //list of obj
                        move_r = pm.moves
                            .filter(mc => highlight_moves.indexOf(mc.ref >= 0))
                            .map(mc => `    ${mc.condition} : ${mc.ref.name[lang]}`)
                            .join('\n');
                        break;
                    case "string":
                        // list of str
                        move_r = pm.moves
                            .filter(mc => highlight_moves.find(m => mc.ref.name[lang] == m))
                            .map(mc => `    ${mc.condition} : ${mc.ref.name[lang]}`)
                            .join('\n');
                        break;
                    default:
                        throw "Unknown";
                }
                break;
            case "string":
                {
                    const mc = pm.moves.find(m => m.ref.name[lang] == highlight_moves);
                    r = mc ? `    ${mc.condition} : ${mc.ref.name[lang]}` : null;
                }
                break;
            default:
                throw "Unknow";
        }
        if (move_r) {
            r += "\n" + move_r;
        }
    }

    return r;
}

function move_name2obj(move_name, lang = "chs") {
    return move_data.find(obj => obj.name[lang] == move_name)
}

function move_names2obj(move_names, lang = "chs") {
    return move_names.map(name => move_name2obj(name, lang));
}
function type_name2obj(type_name) {
    return type_data.find(d => {
        if (d.eng.toLowerCase() == type_name.toLowerCase()) { return true; }
        for (const k of "chs chs_alter cht jpn jpn_alter".split(' ')) {
            if (d[k] == type_name) { return true; }
        }
        return false;
    });
}
function type_names2obj(type_names) {
    return type_names.map(type_name2obj);
}

function F_by_moves(move_names, lang = "chs") {
    const move_objs = move_names2obj(move_names, lang);
    return pm =>
        pm.moves.find(mc => move_objs.indexOf(mc.ref) >= 0)
}

function F_only_final_evolution() {
    return pm => !pm.evolutions
}
function F_by_not_types(type_names) {
    const type_objs = type_names2obj(type_names);
    return pm => {
        for (const pm_type of pm.types) {
            if (type_objs.find(obj => obj.eng == pm_type)) { return false; }
        }
        return true;
    }
}
function F_by_types(type_names) {
    const type_objs = type_names2obj(type_names);
    return pm => {
        for (const pm_type of pm.types) {
            if (type_objs.find(obj => obj.eng == pm_type)) { return true; }
        }
        return false;
    }
}

function F_season3() {
    return pm => pm.paldea_id && (
        (pm.paldea_id >= 1 && pm.paldea_id <= 392) ||
        (pm.paldea_id >= 397 && pm.paldea_id <= 398)
    )
}

function print_pm_summary(list, lang, highlight_moves) {
    console.log(list.map(pm => pm_summary(pm, lang, highlight_moves)).join('\n\n'));
}
function pm() { return pm_data };

module.exports = { pm, F_by_moves, F_by_not_types, F_by_types, F_only_final_evolution, print_pm_summary, F_season3 };