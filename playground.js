const { pm, F_by_moves, F_by_not_types, F_by_types, F_only_final_evolution, print_pm_summary, F_season3 } = require('./SV_dex');


let result;


const s_moves1 = "绑紧、紧束、贝壳夹击、流沙地狱、火焰旋涡、潮旋、熔岩风暴、死缠烂打、捕兽夹、雷电囚笼".split("、");
result = pm().filter(F_by_moves(s_moves1))
    .filter(F_only_final_evolution())
    .filter(F_season3())
print_pm_summary(result, "chs", s_moves1);


// const s_moves2 = "蘑菇孢子，哈欠".split('，');
// result = pm().filter(F_by_moves(s_moves2))
//     .filter(F_only_final_evolution());
// print_pm_summary(result, "chs", s_moves2);

// // 挑点玩鬼太晶诅咒的
// const s_move3 = ["诅咒"]
// result = pm().filter(F_by_moves(s_move3))
//     .filter(F_by_not_types(['鬼']))
//     .filter(F_only_final_evolution());
// print_pm_summary(result, "chs", s_move3);
