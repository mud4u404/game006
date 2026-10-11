import type { Cond, ContentPack, Effect, EyeDef, FightResult, FoeDef, JobDef, NewsDef, NpcDef, QuestDef, RoomDef } from '../types';

/**
 * 武当的江南道据点（Issue #117）：扬州琼花观，武当的下院，观主清和是俗家出身的道长。
 * 规矩见 docs/menpai.md 第七节，写法见 docs/content-guide.md「拜师」，示范见 baishi.ts。
 * id 一律以 smwd_ 开头。
 *
 * 人物与动机：
 * - 清和道长：俗家时走过镖，右肩上留着一支弩箭的旧账。上武当拜了师，学成下来，奉师命回扬州守这处下院。
 *   他收俗家弟子，一是奉师命立门户，二是眼看着东关街的后生一个个被盐号买去当打手——教拳的地方得有人，教规矩的地方更得有。
 * - 邢青：大师兄，俗家记名弟子。当年在码头跟人斗殴，打断了人家的腿，是清和赔了汤药钱把他领上山。
 *   所以他最见不得带着江湖气来拜师的人——那身气他自己身上刮过，知道难刮。
 * - 扫尘：扫院子的小道童，爹娘没了，是观主捡回来的。他盼着观里多几个人，人多，练拳有人喂招，过节有人分一块饼。
 *
 * 两难与代价：
 * - 一人一师门：拜了武当，别家的门就关上了；门规严，在门期间只学本门功夫。
 * - 不恃强凌弱：帮着兵丁白拿醋的、月月收水鬼香火钱的、劝云娘上岸抵债的，观主的门不开。
 * - 考验两条路：领考接观主三十招（太极的柔劲，点到为止）；或者在观里站桩——悟性够的，
 *   观主路过点拨一句就入静；看得出观主右肩旧伤的，他亲自教你借力卸力，省一半火候；都不够的，老老实实站到腿颤。
 */

/* ---------- 地点 ---------- */

const ROOMS: RoomDef[] = [
  {
    id: 'smwd_qionghua', name: '琼花观', area: '扬州 · 琼花观', region: 'yz', t: 10, map: [58, 92],
    desc: [
      { if: { hour: { from: 21, to: 5 } },
        text: '观门虚掩着，殿里一盏长明灯。院子里黑沉沉的，老琼花的枝影投在青砖上，廊下有人在低声念晚课，扫帚靠在墙角。' },
      { if: { flag: 'smwd_in' },
        text: '观巷底一座道观，黄墙黑瓦，门楣上新挂了「武当下院」的小匾。后院一株老琼花，还没到花期。你进门时，扫地的道童老远就喊了一声「师兄」。' },
      { text: '观巷底一座道观，黄墙黑瓦，门楣上新挂了「武当下院」的小匾。院子扫得一尘不染，后院一株老琼花还没到花期。一个道童在扫落叶，一个青衫人靠着廊柱站桩，眼睛半开半闭。' }
    ],
    npcs: ['smwd_qinghe', 'smwd_guqing', 'smwd_saochen'],
    exits: [['西', 'cheng', '观']],
    road: '你从东关街拐进观巷，市声一点一点远了，琼花观的黄墙就在巷底……',
    onEnter: [
      { if: { notFlag: 'smwd_seen' },
        do: [{ type: 'flag', flag: 'smwd_seen' }, { type: 'feed', tag: '江湖', text: '琼花观挂上了武当下院的牌子。观主清和道长是俗家出身，要在扬州收几个俗家弟子。' }] }
    ]
  }
];

/* ---------- 拜入、升地位时的效果 ---------- */

const WD: Cond['sect'] = { school: '武当' };
const WD_OUT: Cond['sect'] = { school: '武当', rank: '外门' };

const WD_JOIN: Effect[] = [
  { type: 'sect', school: '武当', rank: '记名' },
  { type: 'flag', flag: 'smwd_in' },
  // 走「领考」拜入的，站桩的任务一并收尾（任务不能再悬在半截）
  { type: 'quest', id: 'smwd_zhuang', stage: 1 },
  { type: 'rel', npc: 'smwd_qinghe', value: '相谈甚欢', from: ['素不相识', '点头之交'], note: '武当琼花观的观主，收你做了记名弟子' },
  { type: 'feed', tag: '江湖', text: '你拜入武当，做了琼花观清和道长门下的记名弟子。道长当面立了门规：不恃强凌弱，不倚武伤人；门规严，在门期间，不学别派的武功。' },
  { type: 'toast', text: '拜入武当 · 记名弟子' }
];

const yieldOf = (who: string, button: string): FightResult => ({
  tag: '切磋', title: '收手认输', button, story: `你拱手认输。${who}点点头，也收了手：「改日再来。」`
});

/* ---------- 人物 ---------- */

const NPCS: NpcDef[] = [
  {
    id: 'smwd_qinghe', name: '清和道长', ini: '清', tone: 'jade', brief: '靠着廊柱站桩',
    look: '五十来岁，三绺长须，道袍的袖口磨出了毛边——是干活的人的道袍，不是摆样的。右臂抬到肩平就再往上不去，他不遮，也不提。',
    verbs: ['交谈', '观察',
      { verb: '拜师', if: { notFlag: 'smwd_in' } },
      { verb: '领考', if: { flag: 'smwd_asked', notFlag: 'smwd_zhuang', noSect: true } },
      { verb: '请教', if: { sect: WD } },
      { verb: '讨差事', if: { sect: WD } },
      { verb: '考校', if: { sect: WD, notFlag: 'smwd_wai' } }],
    actions: {
      交谈: [
        { if: { sect: WD_OUT },
          text: '道长收了桩，点点头：「外门弟子，出了这道观，报的是武当的名。拳打三分，话留七分——记着。」他望了望后院的老琼花，「观里能教你的，都教得起了。」' },
        { if: { sect: WD },
          text: '道长站着桩，话从肩膀后面传过来：「门规记着：不恃强凌弱，不倚武伤人。在门期间，别派的功夫不许碰。」他缓缓吐了一口气：「拳打匀了，息调顺了，再替人挡几回事，我来考你。」' },
        { if: { flag: 'smwd_ju' },
          text: '道长站桩的身子没动：「你这身功夫，用在欺负人上头，可惜了。我这道观不教你这个。什么时候你学会把手收着点，再说拜师的事。」' },
        { if: { flag: 'smwd_asked', notFlag: 'smwd_zhuang' },
          text: '道长还是那个桩：「考校两条路。想动手，接我三十招，太极的劲，点到为止；不想动手，在院里站桩——站得住，心就静得下来。哪条都行。」' },
        { text: '道长收了桩：「武当在扬州立这处下院，一来奉师命，二来——」他朝东关街的方向抬了抬下巴，「那街上的后生，拳脚是卢馆主教的，可学了拳往哪儿打，没人教——不少叫盐号买去当了打手。学拳的地方有了，教规矩的地方，也得有人。」他拍了拍右肩，「我俗家时走过镖，知道一身功夫没处安放的滋味。」' }
      ],
      观察: [{ text: '他站桩的架子，松而不塌，沉而不僵——院里的落叶飘到他脚边，打着旋儿让开了。' }],
      拜师: [
        { if: { pastSect: { school: '武当' } },
          text: '道长睁开了眼：「山门出去容易，回来难。武当的规矩：叛出门墙的，先在山下想三年。你想清楚了，再来叩这道观门。」' },
        { if: { any: [{ flag: 'cw_qiao' }, { flag: 'zj_bangqiang' }, { flag: 'huafang_betray' }] },
          text: '道长上下打量你，半晌，摇了摇头：「你办过的事，我听说了。仗着功夫欺负人——这门规头一条，你就犯着。」他重新闭眼站桩，「我这道观，不教你这个。」',
          do: [{ type: 'flag', flag: 'smwd_ju' }] },
        { if: { eming: 12 },
          text: '道长摇了摇头：「恶名传得比我这观门还快。俗家弟子出门在外，报的是武当的名——你这个名，武当担不起。先把手上这些事了一了。」' },
        { if: { noSect: true, flag: 'smwd_zhuang' },
          text: '道长收了桩，看了看你站桩站得发麻的两条腿，点了点头：「站得住桩的人，先管得住自己。管得住自己，才学得会太极。」他拂了拂衣袖，「从今往后，你是老道门下的记名弟子。」',
          do: WD_JOIN },
        { if: { noSect: true },
          text: '道长把桩站回去了：「拜老道的门，先过一过考校。想动手的，接我三十招，点到为止；不想动手的，在院里站桩——站住了，就算过了。想好了，来叩门。」',
          do: [{ type: 'quest', id: 'smwd_zhuang', stage: 0 }, { type: 'flag', flag: 'smwd_asked' },
            { type: 'feed', tag: '江湖', text: '琼花观的清和道长说：想拜师，接他三十招，或者在观里站桩，两条路都算考校。' }] },
        { text: '道长稽首：「武当不受两家香火。你身上挂着别家的名分，先去那边了断干净。」' }
      ],
      领考: [
        { if: { hour: { from: 20, to: 5 } },
          text: '道长睁了睁眼：「天黑了。灯要一盏一盏点，功要一天一天练。明早，日头上观门，你来。」' },
        { text: '道长把道袍的下摆掖了掖，走到院中：「来。三十招，太极的劲——你只管用全力，看化不化得开。」', do: [{ type: 'fight', foe: 'smwd_kao' }] }
      ],
      请教: [
        { if: { sect: WD, canLearn: 'wd_taihe', notLearned: 'wd_taihe' },
          text: '道长叫你在琼花树下盘坐：「太和心法，求的是个『和』字。呼吸跟树影一块儿晃——不是你调息，是息调你。」一坐一个下午，你丹田里那点暖意，才慢慢匀开。',
          do: [{ type: 'time', add: 240 }, { type: 'learn', skill: 'wd_taihe', prof: 60 }] },
        { if: { sect: WD, canLearn: 'wd_changquan', notLearned: 'wd_changquan' },
          text: '「武当长拳，起手就是长拳，长拳里有太极。」道长一招一式拆给你看，拳出得慢，收得更慢，「快是练出来的，慢是悟出来的。先把慢的打匀。」你在院里打了一整个下午。',
          do: [{ type: 'time', add: 120 }, { type: 'learn', skill: 'wd_changquan', prof: 60 }] },
        { if: { sect: WD_OUT, canLearn: 'wd_tiyunzong', notLearned: 'wd_tiyunzong' },
          text: '道长指着院墙：「梯云纵，借的是自己的巧劲，不是蛮力。」他右脚在左脚背上一踏，人已上了墙头，落地没有声音。你照着上了几十回，一双布鞋的鞋底磨薄了一层。',
          do: [{ type: 'time', add: 240 }, { type: 'learn', skill: 'wd_tiyunzong', prof: 60 }] },
        { if: { sect: WD_OUT, canLearn: 'wd_mianzhang', notLearned: 'wd_mianzhang' },
          text: '「绵掌，掌是绵的，劲是裹在里头的。」道长一掌按在你胸口，你退了两步才站稳，胸口却不疼，「棉花包着针。针什么时候出去，你说了算。」',
          do: [{ type: 'time', add: 180 }, { type: 'learn', skill: 'wd_mianzhang', prof: 60 }] },
        { if: { sect: WD_OUT, canLearn: 'wd_shenmen', notLearned: 'wd_shenmen' },
          text: '道长从案头取过一柄未开刃的剑，递到你手里：「神门十三剑，十三式，式式取腕。伤人手，不伤人命——武当的剑，点到为止。」他在你手腕上点了一遍，十三处，一处处点过去。',
          do: [{ type: 'time', add: 240 }, { type: 'learn', skill: 'wd_shenmen', prof: 60 }] },
        { if: { sect: WD_OUT, notLearned: 'wd_tiyunzong' },
          text: '道长摇头：「梯云纵借的是心法的巧劲。息还没调匀，你借不动自己。」' },
        { if: { sect: WD_OUT, notLearned: 'wd_mianzhang' },
          text: '道长摇头：「绵掌从长拳里化出来。武当长拳还没到融会贯通，掌上裹不住劲。」' },
        { if: { sect: WD_OUT, notLearned: 'wd_shenmen' },
          text: '道长摇头：「神门十三剑也是长拳的根。拳没到融会贯通，剑就是一根烧火棍。」' },
        { if: { sect: WD_OUT },
          text: '道长稽首：「外门能传的，都传给你了。太极神功、太极拳，是山上内门才传的东西；太极剑、真武除魔，是镇山的宝贝——机缘不到，老道也做不了主。」' },
        { if: { sect: WD },
          text: '道长捻了捻长须：「记名弟子，先打拳和息的底子。拳匀了，息顺了，不忙，来找老道走一趟。走顺了，后头的功夫，一步一步教你。」' },
        { text: '道长稽首：「武当的功夫，不传外人。」' }
      ],
      讨差事: [
        { if: { job: 'smwd_job_cai' }, text: '道长收了桩：「药还没采回来？后山石缝里的七叶一枝花，认叶不认花——采错了不怪你，认对了算你有心。」' },
        { if: { jobOpen: 'smwd_job_cai' },
          text: '道长把药锄递给你：「观里药圃的药断了，去后山采一把七叶一枝花回来。山路上青苔滑，走慢些。」',
          do: [{ type: 'job', id: 'smwd_job_cai' }] },
        { if: { jobOpen: 'smwd_job_shou' },
          text: '道长把一盏灯笼递给你：「观里的丹房要守夜。夜里有人翻过院墙偷过香烛——守到天亮，灯别灭。后半夜犯困，就数灯花。」',
          do: [{ type: 'job', id: 'smwd_job_shou' }] },
        { text: '道长稽首：「这几日观里没有差事。」' }
      ],
      考校: [
        // 两重境界的条件：realm 只能写一个，第二个放进只有一项的 any 里
        { if: { sect: WD, realm: { skill: 'wd_changquan', atLeast: 1 }, any: [{ realm: { skill: 'wd_taihe', atLeast: 1 } }], xia: 15, gongxian: 100 },
          text: '道长叫你在院里打一趟武当长拳，打完了，翻了翻差事簿。他慢慢合上簿子，等拳风落尽，才取下腰间一枚桃木符，系在你腰带上：「外门的符，下山走动带着。」',
          do: [{ type: 'sect', school: '武当', rank: '外门' }, { type: 'flag', flag: 'smwd_wai' }, { type: 'time', add: 60 },
            { type: 'feed', tag: '江湖', text: '你升了武当外门。清和道长说，绵掌、神门十三剑、梯云纵，都可以学了。' },
            { type: 'toast', text: '武当 · 升外门弟子' }] },
        { if: { sect: WD, realm: { skill: 'wd_changquan', atLeast: 1 }, any: [{ realm: { skill: 'wd_taihe', atLeast: 1 } }], xia: 15 },
          text: '道长点了点头：「拳打匀了，息也调顺了。差事簿上替观里办的还空着——去讨一件，办妥了再来。」' },
        { if: { sect: WD, realm: { skill: 'wd_changquan', atLeast: 1 }, any: [{ realm: { skill: 'wd_taihe', atLeast: 1 } }], gongxian: 100 },
          text: '道长又看你打了一趟长拳，看完，也不言语，只把手里的茶盏朝山下转了转，茶沫慢慢漾到另一边：「你的拳还没替人挡过一回。不急，山下有的是。」' },
        { if: { sect: WD, realm: { skill: 'wd_changquan', atLeast: 1 }, any: [{ realm: { skill: 'wd_taihe', atLeast: 1 } }] },
          text: '道长点了点头：「拳和心法都上了身。」他把茶盏放下：「替人挡几回事，观里的差也办几件。不急，老道在这儿等。」' },
        { if: { sect: WD, xia: 15 },
          text: '道长看了看你的架子：「心是有的，拳还没匀。长拳打匀了，息调顺了，再来考校。」' },
        { if: { sect: WD },
          text: '道长摇头：「拳没打匀，事也没替人挡过。」他慢慢啜了口茶：「不急。」' },
        { text: '道长稽首：「你不是武当的人，考校什么？」' }
      ]
    }
  },
  {
    id: 'smwd_guqing', name: '邢青', ini: '邢', tone: 'blue', brief: '在演武场劈砖',
    look: '三十来岁，短打劲装，手背上全是茧和旧痂。眉骨上一道断疤，说话不看他先看你站在哪儿。',
    verbs: ['交谈', '观察',
      { verb: '交差', if: { job: 'smwd_job_shou' } }],
    actions: {
      交差: [
        { text: '邢青接过灯笼，看了看灯芯——亮了一宿，没灭。他把差事簿翻开，勾了一笔：「守夜守成这样，行。」他把灯笼挂回原位：「下一宿，还你。」',
          do: [{ type: 'time', add: 20 }, { type: 'jobDone', id: 'smwd_job_shou' }] }
      ],
      交谈: [
        { if: { sect: WD_OUT },
          text: '邢青收了拳，难得地冲你点了个头：「外门了。出了观门，拳头收着点——收不住的那天，别说是我师弟。」他把手背上的新茧给你看，「这些，都是收着打收出来的。」' },
        { if: { flag: 'smwd_in' },
          text: '邢青上下打量你，还是那张冷脸：「观主收了你，是你的造化。门规背熟了——尤其是头一条。犯了，我亲自请你出观门。」他顿了顿，「我请你过一回别人，知道怎么请。」' },
        { if: { flag: 'smwd_asked' },
          text: '邢青抱着胳膊靠在演武场的桩子上：「想拜师？先想清楚。观主的考校不伤人，我的眼睛伤人——你带着一身江湖气来，我一眼就看得出。别在我面前装乖，装不过的。」' },
        { text: '邢青一掌劈碎了半块砖，拍拍手上的灰：「看你一眼就知道了，腰间挂着兵刃，走路带着风——江湖上的。」他冷笑一声，「我当年也在码头上这么走过，斗殴，打断了人家一条腿。是观主赔了汤药钱，把我领上山。」他把手背伸到你眼前，「这手上的茧，一半是练拳磨的，一半是刮那身江湖气刮的。」' }
      ],
      观察: [{ text: '他劈砖的架子极正，正得过分——是被人一式一式掰过架子的人。掰他架子的人，费的心思比教一个生徒多十倍。' }]
    }
  },
  {
    id: 'smwd_saochen', name: '扫尘', ini: '尘', tone: 'amber', brief: '扫着落叶',
    look: '十二三岁的小道童，头发用一根木簪别着，别得歪歪的。扫帚比他高半头，扫两下就要停下来比一比谁高。',
    verbs: ['交谈', '观察', '打听',
      { verb: '站桩', if: { flag: 'smwd_asked', notFlag: 'smwd_zhuang', noSect: true } },
      { verb: '交药', if: { job: 'smwd_job_cai' } }],
    actions: {
      打听: [
        { if: { flag: 'smwd_asked', notFlag: 'smwd_zhuang' },
          text: '「要拜师，先过考校：想动手，找邢师兄接三十招；不想动手，就在我这儿站桩。观主在廊下看着呢。」' },
        { text: '「我只会扫地。观里的事，观主和邢师兄知道得全；我记性差，转头就忘了。」', do: [{ type: 'news' }] }
      ],
      交谈: [
        { if: { flag: 'smwd_zhuang' },
          text: '扫尘把扫帚一扔，凑过来捏你的腿：「硬了没有？站过桩的腿，头三天都是硬的。我头一回站，哭了一下午——别告诉邢师兄。」' },
        { if: { flag: 'smwd_asked' },
          text: '扫尘把院里的落叶扫到一处，给你腾出一块空地：「站这儿。眼睛看树梢，别看地——看地会晕。」他压低声音，「站不住的时候，就数琼花树枝子。我数过，四百六……反正很多。」' },
        { text: '扫尘停下扫帚：「你是来拜师的？」他往观主那边瞟了一眼，声音压得极低，「观里就我一个道童，邢师兄又不跟我玩。你要是拜进来了——喂招有人，过节分饼也有人。」他忽然站直了，一本正经地补了一句，「我就是这么盼着的。」' }
      ],
      观察: [{ text: '他扫地的路数有讲究：先扫观主门前的，再扫廊下的，最后才是自己院门口的。落叶堆了三堆，一堆比一堆小。' }],
      交药: [
        { text: '扫尘把药接过去，一片叶子一片叶子数：「七叶一枝花，真的七片叶！」他把药捧进丹房，出来时朝你作了个揖，指指簿子，再指指你。',
          do: [{ type: 'time', add: 20 }, { type: 'jobDone', id: 'smwd_job_cai' }] }
      ],
      站桩: [
        { if: { attr: { key: '悟性', atLeast: 25 } },
          text: '你在老琼花树下站定。眼睛刚落到树梢上，廊下的道长忽然开口：「息调你，不是你调息。」就这一句，你呼吸跟树影晃到了一处，大半个时辰的桩，站得脚下生了根。扫尘在旁边看呆了：「你、你头一回就站住了？」',
          do: [{ type: 'time', add: 90 }, { type: 'flag', flag: 'smwd_zhuang' }, { type: 'quest', id: 'smwd_zhuang', stage: 1 }] },
        { if: { flag: 'smwd_jian' },
          text: '你站了没多会儿，观主从廊下踱过来，看了你半晌：「你这架势，肩上僵着——是替人扛过担子的肩。」他伸出右手虚按你的肩井，忽然一顿，「你看出来了？」你把那支弩箭的旧账轻轻点了点。道长笑了，教你把劲从肩上卸到腰上。桩还是那个桩，站起来省了一半的火候。',
          do: [{ type: 'time', add: 120 }, { type: 'flag', flag: 'smwd_zhuang' }, { type: 'quest', id: 'smwd_zhuang', stage: 1 }] },
        { text: '你在老琼花树下站定。眼睛盯着树梢，腿从酸到麻，从麻到抖，汗把领子都浸透了。扫尘在边上数树枝子给你听，数到后来自己都乱了。站到腿一软坐在地上，扫尘把你拉起来：「观主说了——站倒的，歇口气接着站；坐下不站的，才算是倒了。」你咬咬牙，又站了一轮，腿抖成了筛子，桩没散。',
          do: [{ type: 'time', add: 240 }, { type: 'flag', flag: 'smwd_zhuang' }, { type: 'quest', id: 'smwd_zhuang', stage: 1 }] }
      ]
    }
  }
];

/* ---------- 对手：观主的考校 ---------- */

const KAO: FoeDef = {
  id: 'smwd_kao', name: '清和道长', title: '武当考校', ini: '清', tone: 'jade',
  weapon: '一双肉掌', ws: '拳', tag: '考校',
  nature: '中正', reach: '短', rank: 0.6, build: 'inner', spar: true, rounds: 30, firstTell: 3,
  moves: ['揽雀尾', '白鹤亮翅', '野马分鬃', '如封似闭'],
  flourish: ['掌走弧线，绵绵不断', '脚下踩着太极步，进退都在圈里', '一掌按来，掌心含着劲', '半斜半正，让到你侧门'],
  tells: [
    { name: '揽雀尾', text: '道长双手一搭一带，像揽住一条雀尾，顺势往下一沉……', dom: 'li', after: '整条手臂被带得撞向栏杆——那股劲是从他自己掌上来的！' },
    { name: '白鹤亮翅', text: '道长右臂一展，袖子兜住风，整个人像白鹤亮翅般旋开……', dom: 'su', after: '旋到一半忽然变招，一掌已到面门！' }
  ],
  asides: ['老琼花的枝子在风里晃了晃。', '扫尘停了扫帚，扒着月门口看。', '邢青抱着胳膊，眼睛一眨不眨。'],
  opening: ['掌势走老，收回来慢了半拍', '起脚时右肩沉了一沉', '换步时圈外了一寸'],
  intro: '道长把道袍下摆掖进腰带：「太极考校，不比谁快，比谁匀。接老道三十招——你只管全力，看化不化得开。」',
  win: '道长收掌而立，气息匀得像没动过：「好。全力收得住，这拳就算有了骨架。」',
  lose: '道长的掌心贴上你的胸口，轻轻一送——你退了三步才站定。他收掌：「差着火候，不碍。太极是慢功夫。」',
  prep: [
    { if: { flag: 'smwd_jian' }, atk: 0.9, big: 0.9,
      text: '你记着道长右肩抬不过肩的旧账——专往他上盘走。他架起来慢的那半拍，就是你进手的时候。',
      story: '道长的肩伤，叫你看在了眼里。' }
  ],
  results: {
    win: { tag: '考校 · 过', title: '拜入武当', button: '稽首受戒',
      story: '道长收了掌，稽首还礼：「收得住，就有了骨架，剩下的填肉就是。武当在扬州立这处下院，等的就是你这样的后生——从今往后，你是老道门下的记名弟子。门规两条：不恃强凌弱，不倚武伤人；在门期间，不学别派的武功。规矩立在头里，往后省得费口舌。」邢青抱着胳膊在边上看着，脸上那层冰，化了一角。',
      do: WD_JOIN },
    lose: { tag: '考校', title: '差着火候', growth: true, button: '稽首告退',
      story: '道长把你扶起来：「拳是好拳，就是还没匀。想动手的，改日再来接三十招；不想动手的，去院里站桩。桩站住了，来寻老道。」',
      do: [{ type: 'heal', hpAtLeast: 0.5 }] },
    yield: yieldOf('道长', '稽首告退'),
    flee: yieldOf('道长', '稽首告退')
  }
};

/* ---------- 师门差事：采药、守观 ---------- */

const ZEI: FoeDef = {
  id: 'smwd_zei', name: '偷香的贼', title: '惦记丹房的贼', ini: '贼', tone: 'red',
  weapon: '一把匕首', ws: '剑', tag: '守观',
  nature: '阴', reach: '短', rank: 0.6, build: 'outer', weak: 0.8, firstTell: 3,
  moves: ['翻窗', '摸香炉', '闷刀', '跳墙'],
  flourish: ['匕首反着光，专往暗处去', '脚步轻得像猫', '眼睛盯着丹房的门闩', '得手就想溜'],
  tells: [
    { name: '摸香炉', text: '贼的黑影摸到丹房门前，去撬门闩……', dom: 'qiao', after: '门闩一声响，人影缩了回去！' },
    { name: '跳墙', text: '贼见势不好，翻身就往院墙跳……', dom: 'su', after: '墙头上的人影晃了一晃，消失在夜里！' }
  ],
  asides: ['丹房的烛火被风吹得晃了晃。', '扫尘睡得正香，翻了个身。', '院里的老琼花落了一片叶。'],
  opening: ['匕首掉了，弯腰去捡', '翻墙时蹬脱了一块砖', '撬门闩撬出了声'],
  intro: '黑影见你提灯过来，匕首反握在手：「守观的？丹房的香烛借我使使——识相的，装没看见。」',
  win: '贼的匕首飞进了花圃。他翻墙跑了，掉在墙外的一只鞋都没顾上捡。丹房的香烛一根不少，灯笼还在你手里亮着。',
  lose: '匕首划过你的手臂，贼从你腋下钻过去，翻墙走了。丹房的门闩，叫人撬坏了一根。',
  results: {
    win: { tag: '守观 · 安', title: '丹房无事', button: '提灯交差',
      story: '天亮了，你的灯笼还亮着。邢青来换班，看了一眼灯，又看了一眼你，把差事簿翻开，慢慢记了一笔。',
      do: [{ type: 'jobDone', id: 'smwd_job_shou' }] },
    lose: { tag: '守观', title: '丹房失了香烛', button: '提灯天亮',
      story: '贼跑了，香烛少了两把。邢青来换班，看了眼坏掉的门闩，没说话，自己拿工具修了半天，锤子敲得一下比一下重。',
      do: [{ type: 'jobFail', id: 'smwd_job_shou' }, { type: 'heal', hpAtLeast: 0.5 }] }
  }
};

const NPCS_EXTRA: NpcDef[] = [
  {
    id: 'smwd_zei_ren', name: '偷香的贼', ini: '贼', tone: 'red', brief: '在墙根摸黑',
    look: '墙根下的黑影，怀里揣着鼓鼓囊囊的包袱，眼睛盯着丹房的门。',
    at: { room: 'smwd_qionghua', if: { hour: { from: 22, to: 4 }, job: 'smwd_job_shou' } },
    verbs: ['交谈', '动手'],
    actions: {
      交谈: [{ text: '黑影压着嗓子：「守夜的？丹房的香烛，佛……道爷也不要我偷——穷，实话。」' }],
      动手: [{ do: [{ type: 'fight', foe: 'smwd_zei' }] }]
    }
  }
];

/* ---------- 任务：站桩的考验 ---------- */

const JOBS: JobDef[] = [
  { id: 'smwd_job_cai', sect: '武当', tier: 1, title: '去后山采一把七叶一枝花', npc: 'smwd_saochen', at: 'smwd_qionghua', days: 2, again: 2 },
  { id: 'smwd_job_shou', sect: '武当', tier: 1, k: 1.5, title: '夜里守一宿丹房', npc: 'smwd_guqing', at: 'smwd_qionghua', days: 2, again: 3 }
];

const QUESTS: QuestDef[] = [
  { id: 'smwd_zhuang', name: '武当 · 站桩', stages: [
    { title: '过道长的考校', to: 'smwd_qionghua', who: 'smwd_saochen', hint: '道长说，拜他的门先过考校：接他三十招，或是在院里站桩，站住了就算过。',
      need: [{ if: { noSect: true }, text: '了断别家的名分' }] },
    { title: '武当 · 站桩 · 完' }
  ] }
];

/* ---------- 根基之眼 ---------- */

const EYES: EyeDef[] = [
  { npc: 'smwd_qinghe', attr: '体魄', atLeast: 25,
    text: '他的右臂抬到肩平就再也上不去，起手收手都绕着那条线走——右肩里有一笔旧账，是弩箭一类的东西留下的。上盘，是他让出来的一扇门。',
    do: [{ type: 'flag', flag: 'smwd_jian' }] },
  { npc: 'smwd_qinghe', attr: '根骨', atLeast: 33,
    text: '他站桩的脚底下，青砖的棱角磨圆了一圈——桩一站就是十年的人，砖都替他记着。这份内功的底子，山下用钱买不来。' },
  { npc: 'smwd_qinghe', attr: '悟性', atLeast: 29,
    text: '案头供着一柄未开刃的剑，剑柄的穗子换过三茬，鞘口却一点磨痕都没有。剑养在鞘里，不是不能出，是不肯出。' }
];

/* ---------- 传闻 ---------- */

const NEWS: NewsDef[] = [
  { text: '东关街旁的观巷底，琼花观挂上了武当下院的牌子，观主要收几个俗家弟子。', who: ['道士', '货郎', '说书'] },
  { if: { flag: 'smwd_ju' },
    text: '有人想拜琼花观观主的门，叫人挡了驾——听说仗着功夫欺负人的，他一概不收。', who: ['道士', '货郎', '小二'], about: 'you' },
  { if: { flag: 'smwd_in' },
    text: '琼花观的武当道长收了个俗家弟子。东关街的少年们，这几天把观巷都踩热闹了。', who: ['道士', '货郎', '小二'], about: 'you' },
  { if: { flag: 'smwd_wai' },
    text: '琼花观那位俗家弟子升了外门，绵掌、梯云纵都摸得着了。观里的香火，旺了三分。', who: ['道士', '货郎', '小二'], about: 'you' }
];

const pack: ContentPack = {
  rooms: ROOMS,
  npcs: [...NPCS, ...NPCS_EXTRA],
  foes: [KAO, ZEI],
  jobs: JOBS,
  quests: QUESTS,
  eyes: EYES,
  news: NEWS
};
export default pack;
