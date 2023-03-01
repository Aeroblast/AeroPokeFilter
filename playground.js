const { Dex } = require('./SV_dex');

//Dex.avalible();

let result;


const s_moves1 = "绑紧、紧束、贝壳夹击、流沙地狱、火焰旋涡、潮旋、熔岩风暴、死缠烂打、捕兽夹、雷电囚笼"
result = new Dex()
    .F_by_move(s_moves1)
    .F_final_evolution()
    .F_ruleB()
//result.print(s_moves1);

// 挑点玩鬼太晶诅咒的
result = new Dex()
    .F_by_move("诅咒")
    .F_by_move("自我再生 偷懒 月光")
    .F_by_not_type('鬼')
    .F_final_evolution();
//result.print("自我再生 偷懒 月光 诅咒");

result = new Dex()
    //.F_by_move("水蒸气")
    .F_by_ability("强子引擎 夸克充能")
// .F_final_evolution();
result.print("水蒸气");