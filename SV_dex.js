const fs = require('fs')
const path = require("path")


const loadRaw = (file) => fs.readFileSync(path.join(__dirname, file), "utf8").replaceAll('\r', '');
let raw;
raw = loadRaw("data/SV_move_names.txt");
/** id, chs, cht, jpn, eng */
const SV_move_names = raw.split('\n').map(l => l.split('\t'))

raw = loadRaw("data/SV_pm_names.txt")
/** national id, chs, cht, jpn, eng */
const SV_pm_names = raw.split('\n').map(l => l.split('\t'));

raw = loadRaw("data/SV_ability_names.txt")
/** id, chs, cht, jpn, eng */
const SV_ability_names = raw.split('\n').map(l => l.split('\t'));

raw = loadRaw("data/SV_pm_base.txt");
/** national id, form, internal_id, types, abilities, stats*/
const SV_pm_base = raw.split('\n').map(l => l.split('\t'));

raw = loadRaw("data/SV_pm_evo.txt");
/** national id, form, list of level|condition|parameters|species|form  */
const SV_pm_evo = raw.split('\n').map(l => l.split('\t'));

raw = loadRaw("data/SV_pm_moves.txt");
/** national id, form, list of id|condition */
const SV_pm_moves = raw.split('\n').map(l => l.split('\t'));

raw = loadRaw("data/type_names.txt")
/**  CHS/alter JPN/alter English*/
const type_names = raw.split('\n').map(l => l.split('\t'));

raw = loadRaw("data/SV_pm_regional_id.txt");
/**  national palida*/
const SV_pm_regional_id = raw.split('\n').map(l => l.split('\t').map(n => parseInt(n)));

raw = loadRaw("data/SV_pm_form_names.txt");

const SV_pm_form_names = raw.split('\n').map(l => l.split(' '));

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
    "national_id form internal_id types abilities stats"
        .split(' ').forEach((k, i) => t[k] = l[i]);
    t.national_id = parseInt(t.national_id);
    t.form = parseInt(t.form);
    t.internal_id = parseInt(t.internal_id);
    t.types = t.types.split('/');
    t.abilities = t.abilities.split('/').map(id => parseInt(id))
        .map(id => ability_data.find(a => a.id == id));
    const form_name_line = SV_pm_form_names.find(
        line => parseInt(line[0]) == t.national_id && parseInt(line[1]) == t.form);
    if (form_name_line) {
        t.form_name = {};
        "chs".split(' ').forEach(
            (k, i) => { t.form_name[k] = form_name_line[i + 2]; }
        )
    }
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

function pm_summary(pm, highlight_moves = null, lang = "chs") {
    if (typeof (highlight_moves) == "string") highlight_moves = auto_split(highlight_moves, lang);
    const id_padded = (pm.national_id + "").padStart(3, '0');
    const name_str = `${pm.name[lang]}${pm.form_name ? ` (${pm.form_name['chs']})` : ""}`;
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

function move_name2obj(name, lang = "chs") {
    return move_data.find(obj => obj.name[lang] == name)
}

function move_names2obj(names, lang = "chs") {
    return names.map(name => move_name2obj(name, lang));
}

function ability_name2obj(name, lang = "chs") {
    return ability_data.find(obj => obj.name[lang] == name)
}

function ability_names2obj(names, lang = "chs") {
    return names.map(name => ability_name2obj(name, lang));
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

function print_list_summary(list, highlight_moves, lang) {
    if (list.length == 0) {
        console.log("Nothing!");
        return;
    }
    console.log(list.map(pm => pm_summary(pm, highlight_moves, lang)).join('\n\n'));
}
function auto_split(str, lang) {
    switch (lang) {
        case 'chs':
        case 'jpn':
        case 'cht':
            {
                return str.split(/[,，、\t\s]+/);
            }
        case 'eng':
            return str.split(/[,]+/).map(s => s.trim());
    }
    throw "Unknow lang: " + lang;
}

class Dex {
    data;
    lang;
    filters;
    applied = 0;// the count of applied filters
    constructor(dex = null, newF = null) {
        if (dex) {
            this.data = dex.data;
            this.lang = dex.lang;
            this.filters = [...dex.filters];
            this.applied = dex.applied;
            if (newF) {
                this.filters.push(newF);
            }

        } else {
            this.data = pm_data;
            this.lang = 'chs';
            this.filters = [this.f_useless_forms()];
        }

    }
    static raw() {
        return pm_data;
    }
    static avalible() {
        Object.getOwnPropertyNames(Dex.prototype)
            .filter(n => n.indexOf('F_') == 0)
            .forEach(
                filter_name => console.log(filter_name)
            );
    }
    apply() {
        if (this.applied == this.filters.length) return;
        for (; this.applied < this.filters.length; this.applied++) {
            this.data = this.data.filter(this.filters[this.applied])
        }

    }
    print(highlight_moves = null, lang = null) {
        this.apply();
        print_list_summary(this.data, highlight_moves, lang ? lang : this.lang);
    }
    F(filter) {
        return new Dex(this, filter);
    }
    f_id(id, form = null) {
        return pm => pm.national_id == id && (form == null ? true : (form == pm.form))
    }
    f_by_move(names, lang = null) {
        lang = lang ? lang : this.lang;
        if (typeof (names) == "string") names = auto_split(names, lang);
        const objs = move_names2obj(names,);
        return pm =>
            pm.moves.find(mc => objs.indexOf(mc.ref) >= 0);
    }
    f_by_ability(names, lang = null) {
        lang = lang ? lang : this.lang;
        if (typeof (names) == "string") names = auto_split(names, lang);
        const objs = ability_names2obj(names, lang);
        return pm =>
            pm.abilities.find(a => objs.indexOf(a) >= 0);
    }
    f_final_evolution() {
        return pm => !pm.evolutions;
    }
    f_by_not_type(names) {
        if (typeof (names) == "string") names = auto_split(names, 'chs');
        const type_objs = type_names2obj(names);
        return pm => {
            for (const pm_type of pm.types) {
                if (type_objs.find(obj => obj.eng == pm_type)) { return false; }
            }
            return true;
        }
    }
    f_by_type(names) {
        if (typeof (names) == "string") names = auto_split(names, 'chs');
        const type_objs = type_names2obj(names);
        return pm => {
            for (const pm_type of pm.types) {
                if (type_objs.find(obj => obj.eng == pm_type)) { return true; }
            }
            return false;
        }
    }
    f_paldea() {
        return pm => pm.paldea_id;
    }

    f_ruleB() {
        return pm => pm.paldea_id && (
            (pm.paldea_id >= 1 && pm.paldea_id <= 392) ||
            (pm.paldea_id >= 397 && pm.paldea_id <= 398)
        )
    }
    f_ruleC() {
        return pm => pm.paldea_id && (
            (pm.paldea_id >= 1 && pm.paldea_id <= 398)
        )
    }
    f_useless_forms() {
        const lock_form = [
            25,
            422, 423, // 海兔 
            493,
            585, 586, // 四季
            664, 665, 666, // 彩粉蝶
            669, 670, 671, // 花蓓蓓
            744, // 岩狗狗
            778, // 谜拟丘
            854, 855, // 来悲茶
            875, // 冰砌鹅 
            931, // 怒鹦哥
            978, // 米立龙
            982, // 土龙节节
            999,
            1007, 1008
        ];
        const del_form = [{ id: 550, form: 1 }] // 鲈鱼
        return pm => !(
            (lock_form.indexOf(pm.national_id) >= 0 && pm.form != 0)
            || (del_form.find(t => t.id == pm.national_id && t.form == pm.form))
        );
    }
}


Object.getOwnPropertyNames(Dex.prototype).filter(n => n.indexOf('f_') == 0).forEach(
    filter_name => {
        const name2 = filter_name.replace('f', 'F')
        //console.log(name2)
        Dex.prototype[name2] = function (...args) {
            return this.F(this[filter_name](...args));
        }
    }
);




module.exports = { Dex, pm_data, move_data, type_data, ability_data };