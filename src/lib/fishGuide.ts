import type { FishStyle } from '../types';
import { FISH_CATALOG, FISH_METHODS, type CatalogFish } from './fishId/catalog';
import { clampLayerToHabit, habitLayerFloor, handbookOf } from './fishHandbook';

export { clampLayerToHabit, habitLayerFloor };

export type FishGuide = {
  name: string;
  aliases: string;
  intro: string;
  habitat: string;
  habitLayer: string;
  layerFloor: string | null;
  methods: FishStyle[];
  season: string;
  baitHint: string;
  look: string;
  diet: string;
  size: string;
  shanghai: string;
  caution: string;
  sources: string[];
  tips: { style: FishStyle; items: string[] }[];
};

type GuideBody = {
  aliases: string;
  intro: string;
  habitat: string;
  tips: { style: FishStyle; items: string[] }[];
};

const GUIDES: Record<CatalogFish, GuideBody> = {
  鲫鱼: {
    aliases: '鲫瓜、喜头',
    intro: '上海公园湖与河道最常见的底层鱼。口轻、喜群居，气压稳定、水温不太极端时靠边觅食。不依赖溶氧或水温实测数字。',
    habitat: '缓坡、草边、凹岸、进水口附近的泥底。',
    tips: [
      {
        style: '台钓',
        items: ['低温用香腥搓饵或拉饵，抛频放慢。', '子线略放长，钓钝一点。', '标点优先向阳缓坡与草边。'],
      },
    ],
  },
  鲤鱼: {
    aliases: '鲤拐子',
    intro: '底栖杂食，上海收费塘与河道都有。爱拱泥，警惕性高，风力大或气压掉时口会变差。',
    habitat: '凸岸缓坡、桥墩、进水口下游。',
    tips: [
      {
        style: '台钓',
        items: ['谷物香或螺鲤型搓饵，钩距略拉开。', '雨后进水口缓流更值得守。', '大风改背风坎，不要硬抛满竿。'],
      },
    ],
  },
  草鱼: {
    aliases: '鲩',
    intro: '中上层食草鱼类，夏天活跃。上海河湖水草区常见，喜清淡与植物型饵。',
    habitat: '水草区中层、进水口漂浮物下。',
    tips: [
      {
        style: '台钓',
        items: ['气温偏高用本味或清香，颗粒、玉米可用。', '钓半水或离底，跟着鱼层走。', '避开正午暴晒的亮水。'],
      },
    ],
  },
  青鱼: {
    aliases: '螺蛳青',
    intro: '大型底层鱼，上海深潭、桥墩、螺底更常见。力道大，适合守钓。',
    habitat: '深潭、桥墩、螺蛳底。',
    tips: [
      {
        style: '台钓',
        items: ['螺蛳、重窝守钓，线组要结实。', '标点选深和水流交界。', '口少就守，不要频繁换点。'],
      },
    ],
  },
  鳊鱼: {
    aliases: '武昌鱼、长春鳊',
    intro: '中上层，口快，上海河道草边常见。喜群，可用偏雾化的饵。',
    habitat: '草边中层、缓流。',
    tips: [
      {
        style: '台钓',
        items: ['拉饵或颗粒，钓离底。', '抛频可以略快。', '草边比亮水中央更容易连口。'],
      },
    ],
  },
  鲮鱼: {
    aliases: '土鲮',
    intro: '南方底层鱼，上海部分坑塘有放养。喜腥香，水温偏低时口差。',
    habitat: '塘底缓坡、增氧机附近（不编造溶氧值）。',
    tips: [
      {
        style: '台钓',
        items: ['腥香拉饵，钩要小。', '钓钝、抓顿口。', '人少的下风口更好做窝。'],
      },
    ],
  },
  黄颡鱼: {
    aliases: '黄辣丁、昂刺',
    intro: '夜行底层，上海河道夜钓常见。喜荤，有硬棘，摘钩要小心。',
    habitat: '桥墩、乱石、缓流底。',
    tips: [
      {
        style: '台钓',
        items: ['蚯蚓、红虫或商品腥饵。', '夜钓桥墩与乱石缝。', '子线略短，防锚草。'],
      },
    ],
  },
  黄鱼: {
    aliases: '小黄鱼（河口）',
    intro: '上海河口偶见，偏海水鱼。岸抛以荤饵为主，看潮不看编造水温。',
    habitat: '河口、防波堤。',
    tips: [
      {
        style: '台钓',
        items: ['沙蚕、虾肉，沉底。', '涨落潮前后更值得守。', '风大就选背风堤段。'],
      },
    ],
  },
  鲻鱼: {
    aliases: '乌头、脂眼鲻',
    intro: '河口广盐性，上海滨江可见。手竿商品饵有效，路亚效果差。',
    habitat: '滨江缓流、闸口。',
    tips: [
      {
        style: '台钓',
        items: ['商品饵或虾肉，钓离底或轻触底。', '闸口进出水时口更好。', '线组不要太粗。'],
      },
    ],
  },
  鲈鱼: {
    aliases: '花鲈、海鲈',
    intro: '掠食性，上海坝头、乱石、河口常见。晨昏窗口更活跃。',
    habitat: '坝头乱石、桥墩、急流边。',
    tips: [
      {
        style: '路亚',
        items: ['米诺、VIB 或软虫贴结构。', '搜索坝头与乱石带。', '收线有停顿，模拟逃窜小鱼。'],
      },
    ],
  },
  翘嘴: {
    aliases: '翘嘴鲌、白鱼',
    intro: '上海公园湖与河道的主力路亚对象。中上层掠食，常在晨昏追小鱼。体侧银白、下颌上翘。编译自渔夫者/钓鱼007 与公开河道经验，不是实时大数据。',
    habitat: '亮水区、深浅交界、进出水口。',
    tips: [
      {
        style: '路亚',
        items: [
          '夏秋白天多用 7–12g 亮片或米诺平行收；冬春可加大到 12–20g。',
          '夜钓 7–10g，收线放慢。',
          '先搜亮水中上层，口轻再放慢或换软虫。',
          '清水偏银白，浊水可用红头金。',
        ],
      },
    ],
  },
  黑鱼: {
    aliases: '乌鳢、生鱼',
    intro: '伏击型，夏季草区最活跃。上海荷塘、芦苇边常见。',
    habitat: '草洞、荷叶边、浅滩障碍。',
    tips: [
      {
        style: '路亚',
        items: ['雷蛙落水先停两秒，再短抽走停。', '打到鱼要压竿，避免硬拔。', '障碍区用加强线组。'],
      },
    ],
  },
  鳜鱼: {
    aliases: '桂鱼、鳌花',
    intro: '底层伏击，爱结构。上海桥墩、石缝、缓流坎常见。',
    habitat: '桥墩、石缝、缓流坎。',
    tips: [
      {
        style: '路亚',
        items: ['铅头钩配卷尾，溪流 5–7g、湖库 7–10g。', '贴底跳、慢拖。', '专攻有结构的阴处。'],
      },
    ],
  },
  鳡鱼: {
    aliases: '黄钻',
    intro: '大型掠食，上海开放水域少见但有记录。冲劲大，适合远投。',
    habitat: '开阔水面、深浅交界。',
    tips: [
      {
        style: '路亚',
        items: ['大克数亮片或米诺远投。', '匀速收，中鱼后要控方向。', '选开阔少船的水面。'],
      },
    ],
  },
  红鳍鲌: {
    aliases: '红梢、翘嘴近亲',
    intro: '鲌亚科，习性接近翘嘴，体型常略小。上海河道可兼钓。',
    habitat: '近岸中上层、回流。',
    tips: [
      {
        style: '路亚',
        items: ['小克数亮片、波爬。', '沿回流搜索。', '操法与翘嘴类似，饵可以更小。'],
      },
    ],
  },
  白条: {
    aliases: '餐条、蓝刀',
    intro: '上层群鱼，上海几乎所有水面都有。台钓袖钩与微物路亚都能打。',
    habitat: '近岸浅层、漂浮物下。',
    tips: [
      {
        style: '台钓',
        items: ['拉饵打频率，钩要小。', '钓水皮或一标深。'],
      },
      {
        style: '路亚',
        items: ['瓜子亮片 1.5–3g，快收。', '岸边有小鱼炸水再下竿。'],
      },
    ],
  },
  罗非鱼: {
    aliases: '非洲鲫',
    intro: '南方坑塘常见，上海温室塘或夏天野河偶见。台钓经典，微物也可。',
    habitat: '塘边浅滩、向阳坡。',
    tips: [
      {
        style: '台钓',
        items: ['腥香拉饵，钓钝。', '向阳浅滩更好。'],
      },
      {
        style: '路亚',
        items: ['小型软虫跳底。', '障碍边慢搜。'],
      },
    ],
  },
  鲶鱼: {
    aliases: '土鲶',
    intro: '夜行肉食，上海河道夜钓常见。喜荤，障碍区多。',
    habitat: '桥洞、倒树、深坑。',
    tips: [
      {
        style: '台钓',
        items: ['大蚯蚓或动物内脏沉底。', '夜钓桥洞。'],
      },
      {
        style: '路亚',
        items: ['软虫、胡须佬贴底。', '慢拖停顿。'],
      },
    ],
  },
  塘鲺: {
    aliases: '胡子鲶',
    intro: '坑塘放养多见，底层肉食。手法接近鲶。',
    habitat: '塘角、增氧机附近、进出水。',
    tips: [
      {
        style: '台钓',
        items: ['腥饵或虫饵底钓。', '夜口更好。'],
      },
      {
        style: '路亚',
        items: ['小型软虫沿塘角搜。', '跳底要慢。'],
      },
    ],
  },
};

const FALLBACK: Omit<
  FishGuide,
  'name' | 'methods' | 'habitLayer' | 'layerFloor' | 'season' | 'baitHint' | 'look' | 'diet' | 'size' | 'shanghai' | 'caution' | 'sources'
> = {
  aliases: '词表外对象',
  intro: '暂无专条。请改选词表内鱼种，或按今日方案的味形/拟饵与标点作钓。不编造溶氧或水温。',
  habitat: '按当前标点建议选择结构。',
  tips: [
    { style: '台钓', items: ['按方案味形开饵，先守后变。'] },
    { style: '路亚', items: ['按方案拟饵搜索深浅交界。'] },
  ],
};

const FISH_FACTS: Record<
  CatalogFish,
  { season: string; look: string; diet: string; size: string; shanghai: string; caution: string }
> = {
  鲫鱼: {
    season: '四季，春秋更稳',
    look: '体侧扁、青灰或金黄，无须。口小下位。',
    diet: '杂食，刮底泥里的有机碎屑、虫、藻。',
    size: '野河常见一掌长，坑塘可更大。',
    shanghai: '公园湖、河道、收费塘都常见，上海入门对象。',
    caution: '口轻，别把气压读数当成开口保证。不编造溶氧。',
  },
  鲤鱼: {
    season: '春末到秋',
    look: '体延长、口有短须，鳞大。',
    diet: '拱泥杂食，谷物、螺蚌、底栖昆虫。',
    size: '河道常见斤级，塘里可更大。',
    shanghai: '收费塘与苏州河、黄浦支流都有。',
    caution: '警觉，大风或乱人声时口差。',
  },
  草鱼: {
    season: '夏秋',
    look: '圆筒形、青灰，下咽齿发达。',
    diet: '成鱼以水草、藻类为主，也吃颗粒。',
    size: '河湖常见数斤级。',
    shanghai: '水草区、进水口漂浮物下更常见。',
    caution: '正午亮水少待，跟着鱼层走。',
  },
  青鱼: {
    season: '夏秋',
    look: '体色青黑，头比草鱼钝。',
    diet: '螺蛳、蚌类，成鱼偏肉食底栖。',
    size: '大型，线组要结实。',
    shanghai: '深潭、桥墩、螺底。',
    caution: '口少就守，不要频繁换点。',
  },
  鳊鱼: {
    season: '夏秋',
    look: '体高侧扁，俗称武昌鱼。',
    diet: '水草、碎屑、小型无脊椎。',
    size: '河道常见半斤到斤级。',
    shanghai: '草边中层、缓流。',
    caution: '口快可加快抛频，亮水中央不如草边。',
  },
  鲮鱼: {
    season: '夏秋（上海坑塘）',
    look: '体延长、下位口，南方常见。',
    diet: '刮食藻类与底栖有机物。',
    size: '塘里常见半斤上下。',
    shanghai: '部分坑塘放养，野河少。',
    caution: '水温偏低时口差，钩要小。',
  },
  黄颡鱼: {
    season: '夜钓更常见',
    look: '黄褐有斑，胸鳍硬棘。',
    diet: '底栖肉食，小鱼虾、昆虫。',
    size: '常见一两到半斤。',
    shanghai: '桥墩、乱石、缓流底，夜口好。',
    caution: '摘钩防刺。',
  },
  黄鱼: {
    season: '看潮，河口',
    look: '金黄、下位口，偏海水鱼。',
    diet: '底栖虾蟹、小鱼。',
    size: '岸抛多为小个体。',
    shanghai: '河口、防波堤偶见。',
    caution: '看潮不看编造水温。',
  },
  鲻鱼: {
    season: '滨江闸口',
    look: '银白、脂眼，广盐性。',
    diet: '刮食藻与有机碎屑。',
    size: '闸口可见斤级。',
    shanghai: '滨江缓流、闸口进出水。',
    caution: '路亚效果差，手竿更对路。',
  },
  鲈鱼: {
    season: '晨昏窗口',
    look: '体侧有斑，口裂大。',
    diet: '掠食小鱼、虾。',
    size: '坝头常见斤级到数斤。',
    shanghai: '坝头乱石、桥墩、急流边。',
    caution: '贴结构搜索，不要空收亮水。',
  },
  翘嘴: {
    season: '晨昏追小鱼',
    look: '体侧银白、下颌上翘。',
    diet: '掠食上层小鱼。',
    size: '公园湖常见半斤到数斤。',
    shanghai: '公园湖与河道主力路亚对象。',
    caution: '清水偏银白，浊水可用红头金。不是实时大数据。',
  },
  黑鱼: {
    season: '夏季草区',
    look: '圆筒、头平、口大。',
    diet: '伏击鱼、蛙。',
    size: '荷塘常见斤级以上。',
    shanghai: '荷塘、芦苇边。',
    caution: '中鱼压竿，障碍区加强线组。',
  },
  鳜鱼: {
    season: '春秋结构区',
    look: '斑纹、口裂斜裂。',
    diet: '伏击小鱼。',
    size: '桥墩常见半斤到两斤。',
    shanghai: '桥墩、石缝、缓流坎。',
    caution: '贴底跳、慢拖，阴处结构优先。',
  },
  鳡鱼: {
    season: '夏秋远投',
    look: '细长、口裂大。',
    diet: '大型掠食。',
    size: '开放水域偶见大个体。',
    shanghai: '开阔水面少见但有记录。',
    caution: '冲劲大，控方向。',
  },
  红鳍鲌: {
    season: '与翘嘴相近',
    look: '鲌亚科，鳍常带红。',
    diet: '小鱼、水面昆虫。',
    size: '常比翘嘴略小。',
    shanghai: '河道可兼钓。',
    caution: '饵可以更小，沿回流搜。',
  },
  白条: {
    season: '几乎全年',
    look: '细长银白，俗称餐条。',
    diet: '浮游、水面碎屑、小虫。',
    size: '常见一指长。',
    shanghai: '几乎所有水面都有。',
    caution: '袖钩或微物，打频率。',
  },
  罗非鱼: {
    season: '夏天或温室塘',
    look: '侧扁、长背鳍。',
    diet: '杂食，刮藻也吃商品饵。',
    size: '塘里常见半斤。',
    shanghai: '温室塘或夏天野河偶见。',
    caution: '向阳浅滩更好。',
  },
  鲶鱼: {
    season: '夜钓',
    look: '无鳞、口须明显。',
    diet: '夜行肉食。',
    size: '桥洞可见斤级。',
    shanghai: '桥洞、倒树、深坑。',
    caution: '夜口更好，慢拖停顿。',
  },
  塘鲺: {
    season: '夜口更好',
    look: '似鲶，头扁有须。',
    diet: '底层肉食。',
    size: '坑塘放养多见。',
    shanghai: '塘角、进出水。',
    caution: '手法接近鲶，跳底要慢。',
  },
};

export function fishGuide(name: string): FishGuide {
  const key = FISH_CATALOG.find((row) => row === name);
  const body = key ? GUIDES[key] : FALLBACK;
  const methods = key ? [...FISH_METHODS[key]] : (['台钓', '路亚'] as FishStyle[]);
  const book = handbookOf(name);
  const facts = key
    ? FISH_FACTS[key]
    : {
        season: '—',
        look: '词表外，待公开百科补充。',
        diet: '—',
        size: '—',
        shanghai: '上海水域未建专条。',
        caution: '不编造溶氧或水温。',
      };
  return {
    name: key ?? name,
    aliases: body.aliases,
    intro: body.intro,
    habitat: body.habitat,
    habitLayer: book?.habitLayer ?? '按今日方案',
    layerFloor: book?.layerFloor ?? null,
    methods,
    season: facts.season,
    baitHint: book?.baitHint ?? '按今日方案味形/拟饵',
    look: facts.look,
    diet: facts.diet,
    size: facts.size,
    shanghai: facts.shanghai,
    caution: facts.caution,
    sources: book?.sources ?? [],
    tips: body.tips.filter((row) => methods.includes(row.style)),
  };
}
