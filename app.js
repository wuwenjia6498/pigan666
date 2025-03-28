// 数据库初始化
let answersDatabase = {};
let booksDatabase = {}; // 初始化为空对象，后续从localStorage加载或设置默认值
// 历史测评记录
let historyRecords = [];

// 五个能力维度名称
const dimensionNames = [
    "获取信息维度",
    "整体感知维度", 
    "解释推断维度",
    "评价鉴赏维度",
    "转化运用维度"
];

// 维度描述及建议
const dimensionDetails = {
    0: {
        description: "获取信息能力是指从文本中获取明确的事实和细节的能力。",
        lowSuggestion: "建议多进行细节阅读训练，注意标记关键信息。",
        highSuggestion: "已具备良好的获取信息能力，可尝试更复杂的文本。"
    },
    1: {
        description: "整体感知能力是指理解文本的整体内容、主旨和结构的能力。",
        lowSuggestion: "建议尝试概括文章段落大意，识别文章主题的训练。",
        highSuggestion: "已具备不错的整体感知能力，可尝试分析更长文章的结构。"
    },
    2: {
        description: "解释推断能力是指根据文本线索进行合理推断和解释的能力。",
        lowSuggestion: "建议多关注文本中的因果关系，进行预测和推断训练。",
        highSuggestion: "解释推断能力很好，可尝试理解更复杂的隐含含义。"
    },
    3: {
        description: "评价鉴赏能力是指对文本内容、写作手法等进行评价和鉴赏的能力。",
        lowSuggestion: "建议多进行阅读赏析训练，学习识别文本的表达技巧。",
        highSuggestion: "评价鉴赏能力优秀，可尝试更全面深入的文本分析。"
    },
    4: {
        description: "转化运用能力是指将所学知识应用到新情境中的能力。",
        lowSuggestion: "建议多进行知识应用练习，尝试将阅读内容与实际生活联系。",
        highSuggestion: "转化运用能力出色，可尝试更复杂的知识迁移任务。"
    }
};

// API地址配置
const API_BASE_URL = 'http://localhost:3000/api';

// API客户端
const api = {
    // 获取所有年级的书籍列表
    async getBooks() {
        try {
            const response = await fetch(`${API_BASE_URL}/books`);
            if (!response.ok) throw new Error('获取书籍列表失败');
            
            const data = await response.json();
            return data.success ? data.data : {};
        } catch (error) {
            console.error('获取书籍列表错误:', error);
            return {};
        }
    },
    
    // 获取指定年级和书籍的标准答案
    async getAnswers(grade, book) {
        try {
            const encodedBook = encodeURIComponent(book);
            const response = await fetch(`${API_BASE_URL}/answers/${grade}/${encodedBook}`);
            
            if (response.status === 404) {
                return null; // 书籍不存在
            }
            
            if (!response.ok) throw new Error('获取标准答案失败');
            
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('获取标准答案错误:', error);
            return null;
        }
    },
    
    // 获取指定年级和书籍的格式化答案（内部格式）
    async getFormattedAnswers(grade, book) {
        try {
            const bookDir = `/server/data/grade-${grade}/${encodeURIComponent(book)}`;
            const formattedFilePath = `${bookDir}/formatted-answers.json`;
            
            const response = await fetch(formattedFilePath);
            if (!response.ok) throw new Error('获取格式化答案失败');
            
            return await response.json();
        } catch (error) {
            console.error('获取格式化答案错误:', error);
            return null;
        }
    },
    
    // 上传Excel文件并保存标准答案
    async uploadAnswers(file, grade, book) {
        try {
            const formData = new FormData();
            formData.append('excelFile', file);
            formData.append('grade', grade);
            formData.append('book', book);
            
            const response = await fetch(`${API_BASE_URL}/upload-answers`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error('上传答案失败');
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('上传答案错误:', error);
            return { success: false, message: error.message };
        }
    },
    
    // 删除书籍及其答案
    async deleteBook(grade, book) {
        try {
            const encodedBook = encodeURIComponent(book);
            const response = await fetch(`${API_BASE_URL}/books/${grade}/${encodedBook}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('删除书籍失败');
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('删除书籍错误:', error);
            return { success: false, message: error.message };
        }
    }
};

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 确保加载XLSX库
    if (!window.XLSX) {
        console.error('XLSX库未加载，Excel导入功能将不可用');
    }
    
    // 从本地存储加载数据
    loadLocalData();
    
    // 初始化默认答案数据
    initDefaultAnswers();
    
    // 初始化导航
    setupNavigation();
    
    // 初始化年级选择
    initGradeSelection();
    
    // 设置答案提交
    setupAnswerSubmission();
    
    // 设置答案保存
    setupStandardAnswersSave();
    
    // 设置Excel导入
    setupExcelImport();
    
    // 设置书籍删除
    setupBookDeletion();
    
    // 设置历史记录
    setupHistoryRecords();
    
    // 设置分享功能
    setupSharingFeature();
    
    // 设置打印功能
    setupPrintFeature();
});

// 初始化默认答案数据
function initDefaultAnswers() {
    // 只有当本地存储中没有答案数据时才初始化默认答案
    if (Object.keys(answersDatabase).length === 0) {
        console.log('初始化默认答案数据');
        
        // 一年级《小兔的帽子》默认答案
        answersDatabase['1-小兔的帽子'] = {
            questions: [
                "故事中，小兔子有几顶帽子？",
                "小兔子最喜欢哪顶帽子？",
                "小熊送给小兔子的帽子是什么颜色的？",
                "小兔子为什么要送帽子给朋友们？",
                "谁得到了红色的帽子？",
                "小兔子在故事的最后感觉怎么样？",
                "为什么小猫戴上帽子后很开心？",
                "小兔子送出帽子后学会了什么？",
                "故事告诉我们什么道理？",
                "如果你是小兔子，你会把帽子送给朋友吗？",
                "小兔子收到了几顶新帽子？",
                "故事发生在什么季节？",
                "小兔子是一个怎样的角色？",
                "小兔子的朋友们收到帽子后都做了什么？",
                "故事的结尾给你什么感受？"
            ],
            options: [
                {A: "一顶", B: "两顶", C: "三顶", D: "四顶"},
                {A: "红色的", B: "蓝色的", C: "黄色的", D: "绿色的"},
                {A: "红色", B: "蓝色", C: "黄色", D: "绿色"},
                {A: "因为他不喜欢这些帽子了", B: "因为他想让朋友们开心", C: "因为他有太多帽子了", D: "因为帽子太小了"},
                {A: "小猴", B: "小猫", C: "小狗", D: "小鸟"},
                {A: "伤心", B: "生气", C: "开心", D: "害怕"},
                {A: "因为帽子很漂亮", B: "因为帽子很暖和", C: "因为这是礼物", D: "因为帽子正好合适"},
                {A: "分享", B: "保护帽子", C: "做帽子", D: "收集帽子"},
                {A: "要保护好自己的东西", B: "分享会带来快乐", C: "帽子很重要", D: "朋友很多很好"},
                {A: "会", B: "不会", C: "不确定", D: "看心情"},
                {A: "没有收到", B: "一顶", C: "两顶", D: "三顶"},
                {A: "春天", B: "夏天", C: "秋天", D: "冬天"},
                {A: "自私的", B: "慷慨的", C: "胆小的", D: "调皮的"},
                {A: "立刻戴上了", B: "收起来了", C: "送还给小兔子", D: "互相交换"},
                {A: "感动", B: "无聊", C: "惊讶", D: "失望"}
            ],
            answers: ["C", "A", "B", "B", "B", "C", "C", "A", "B", "A", "C", "D", "B", "A", "A"],
            dimensions: [0, 0, 0, 2, 0, 1, 2, 1, 3, 4, 0, 2, 3, 1, 3],
            explanations: [
                "故事中明确提到小兔子有三顶帽子。",
                "故事中提到小兔子最喜欢红色的帽子。",
                "小熊送给小兔子的是蓝色的帽子。",
                "小兔子是为了让朋友们开心才送帽子的。",
                "故事中小猫得到了红色的帽子。",
                "送出帽子后，小兔子感到很开心。",
                "小猫开心是因为这是朋友的礼物。",
                "小兔子通过送帽子学会了分享。",
                "故事告诉我们分享会带来快乐。",
                "正确的选择是会，因为分享能带来快乐。",
                "故事结尾，小兔子收到了三顶新帽子。",
                "从故事描述看，故事发生在冬天。",
                "小兔子是个慷慨的角色，愿意分享。",
                "朋友们收到帽子后都立刻戴上了。",
                "故事结尾让人感动，因为分享带来了更多的快乐。"
            ]
        };
        
        // 三年级《小王子》默认答案
        answersDatabase['3-小王子'] = {
            questions: [
                "小王子来自哪里？",
                "小王子在自己的星球上照顾什么植物？",
                "小王子遇见的第一个角色是谁？",
                "狐狸教给小王子什么重要的道理？",
                "小王子为什么离开自己的星球？",
                "小王子的玫瑰花有什么特别之处？",
                "小王子在沙漠中寻找什么？",
                "飞行员为什么会在沙漠中遇见小王子？",
                "小王子最后是怎么离开地球的？",
                "故事的叙述者是谁？",
                "小王子访问了多少个星球？",
                "商人在数什么？",
                "小王子最珍视的是什么？",
                "这个故事主要是关于什么的？",
                "为什么狐狸说'真正重要的东西用眼睛是看不见的'？"
            ],
            options: [
                {A: "地球", B: "月球", C: "B612小行星", D: "火星"},
                {A: "玫瑰花", B: "猴面包树", C: "向日葵", D: "仙人掌"},
                {A: "狐狸", B: "蛇", C: "玫瑰", D: "国王"},
                {A: "保持警惕", B: "追求财富", C: "驯养的意义", D: "如何种花"},
                {A: "探险", B: "玫瑰惹他生气", C: "寻找朋友", D: "躲避危险"},
                {A: "会说话", B: "有刺", C: "是独一无二的", D: "会移动"},
                {A: "宝藏", B: "水井", C: "朋友", D: "回家的路"},
                {A: "飞机故障", B: "迷路了", C: "在寻找小王子", D: "偶然相遇"},
                {A: "乘飞机", B: "被蛇咬了", C: "和飞行员一起离开", D: "消失了"},
                {A: "小王子", B: "狐狸", C: "玫瑰", D: "飞行员"},
                {A: "5个", B: "6个", C: "7个", D: "8个"},
                {A: "钱", B: "羊", C: "星星", D: "时间"},
                {A: "他的星球", B: "他的玫瑰", C: "金色的头发", D: "他的朋友"},
                {A: "冒险", B: "友情", C: "爱与责任", D: "星际旅行"},
                {A: "因为眼睛容易欺骗人", B: "因为真正重要的是内在品质", C: "因为最珍贵的东西是无形的", D: "因为狐狸说的都是谎言"}
            ],
            answers: ["C", "A", "B", "C", "B", "C", "B", "A", "B", "D", "C", "C", "B", "C", "B"],
            dimensions: [0, 0, 0, 2, 2, 1, 0, 0, 0, 1, 0, 0, 3, 3, 2],
            explanations: [
                "小王子来自B612小行星。",
                "小王子在自己的星球上照顾玫瑰花。",
                "小王子在地球上遇见的第一个角色是蛇。",
                "狐狸教给小王子驯养的意义，以及责任和联系的重要性。",
                "小王子离开自己的星球是因为玫瑰惹他生气。",
                "小王子的玫瑰花之所以特别是因为对他来说是独一无二的。",
                "小王子在沙漠中寻找水井。",
                "飞行员因为飞机故障才在沙漠中遇见小王子。",
                "小王子是被蛇咬了才离开地球的。",
                "故事的叙述者是飞行员。",
                "小王子一共访问了7个星球。",
                "商人在数星星。",
                "小王子最珍视的是他的玫瑰。",
                "这个故事主要是关于爱与责任的。",
                "狐狸这句话是指真正重要的是内在品质，而非外表。"
            ]
        };
        
        // 六年级《三体》默认答案（简易版）
        answersDatabase['6-三体'] = {
            questions: [
                "《三体》主要讲述的是什么文明之间的故事？",
                "叶文洁为什么要向宇宙发送信息？",
                "三体世界面临的主要问题是什么？",
                "地球文明得知三体文明即将入侵后的计划是什么？",
                "罗辑被选为什么职位？",
                "三体人无法解决的科学难题是什么？",
                "ETO组织的主要目的是什么？",
                "三体文明入侵地球的预计时间是多久？",
                "智子的主要功能是什么？",
                "面壁者计划的本质是什么？",
                "什么物理现象导致三体世界的不可预测性？",
                "史强的职业是什么？",
                "地球未来面临的黑暗森林法则是指什么？",
                "威慑纪元是基于什么建立的？",
                "程心与罗辑在处理危机方面的主要区别是什么？"
            ],
            options: [
                {A: "地球与火星", B: "地球与三体", C: "人类与机器人", D: "地球与外星生物"},
                {A: "寻求帮助", B: "科学实验", C: "报复人类", D: "寻找朋友"},
                {A: "粮食短缺", B: "气候变化", C: "三体星系的不稳定性", D: "内部冲突"},
                {A: "立即投降", B: "集体撤离", C: "开发尖端科技", D: "寻求外交解决"},
                {A: "国家主席", B: "军事指挥官", C: "面壁者", D: "科学顾问"},
                {A: "时间旅行", B: "三体问题", C: "永动机", D: "人工智能"},
                {A: "促进科技发展", B: "协助三体人征服地球", C: "研究外星文明", D: "保护地球环境"},
                {A: "10年", B: "50年", C: "100年", D: "400年"},
                {A: "翻译语言", B: "封锁科学发展", C: "提供能源", D: "传输信息"},
                {A: "欺骗敌人", B: "团结人类", C: "发展武器", D: "逃离地球"},
                {A: "引力波", B: "三体运动", C: "量子纠缠", D: "相对论效应"},
                {A: "科学家", B: "警察", C: "政治家", D: "军人"},
                {A: "物种间必然的战争", B: "资源争夺", C: "物种进化规律", D: "宇宙文明间的猜疑链"},
                {A: "军事力量", B: "科技优势", C: "宇宙广播", D: "毁灭威慑"},
                {A: "性别差异", B: "个人能力", C: "道德观念", D: "对人性的理解"}
            ],
            answers: ["B", "C", "C", "C", "C", "B", "B", "D", "B", "A", "B", "B", "D", "D", "C"],
            dimensions: [0, 2, 0, 0, 0, 1, 2, 0, 1, 3, 1, 0, 3, 2, 3],
            explanations: [
                "《三体》主要讲述的是地球与三体文明之间的故事。",
                "叶文洁向宇宙发送信息是为了报复人类，因为文革中遭受的痛苦。",
                "三体世界面临的主要问题是三体星系的不稳定性，导致极端环境变化。",
                "地球文明得知三体文明即将入侵后，主要计划是开发尖端科技以对抗入侵。",
                "罗辑被选为面壁者，负责制定对抗三体文明的战略。",
                "三体问题是三体人无法解决的科学难题，也是导致其世界混乱的原因。",
                "ETO（地球三体组织）的主要目的是协助三体人征服地球。",
                "三体舰队预计在约400年后抵达地球。",
                "智子的主要功能是封锁地球的科学发展，阻止人类取得技术突破。",
                "面壁者计划的本质是通过一系列行动欺骗敌人（三体文明）。",
                "三体问题（三体运动）导致三体世界的气候和环境不可预测。",
                "史强是一名警察（后成为PDC安全部门的负责人）。",
                "黑暗森林法则指的是宇宙文明间的猜疑链，导致文明间必然相互毁灭。",
                "威慑纪元是基于毁灭威慑建立的和平时期。",
                "程心与罗辑在处理危机时最大的区别在于道德观念和对人性的理解不同。"
            ]
        };
        
        // 保存到本地存储
        localStorage.setItem('answersDatabase', JSON.stringify(answersDatabase));
    }
}

// 从本地存储加载书籍数据
function loadBooksFromLocalStorage() {
    console.log('开始从localStorage加载书籍数据');
    const savedBooks = localStorage.getItem('booksDatabase');
    if (savedBooks) {
        try {
            const parsedBooks = JSON.parse(savedBooks);
            console.log('从localStorage读取的原始booksDatabase:', parsedBooks);
            booksDatabase = parsedBooks;
            console.log('从本地存储加载了书籍库数据，当前booksDatabase:', booksDatabase);
            
            // 检查是否有有效数据
            let hasData = false;
            for (const grade in booksDatabase) {
                if (booksDatabase[grade] && booksDatabase[grade].length > 0) {
                    hasData = true;
                    console.log(`年级${grade}有${booksDatabase[grade].length}本书`);
                }
            }
            
            if (!hasData) {
                console.log('booksDatabase虽然存在但没有实际数据');
                // 初始化为默认值
                booksDatabase = {
                    "1": ["你为什么不开花", "小兔的帽子", "森林音乐会", "彩虹桥的故事"],
                    "2": ["星星的旅行", "小猫钓鱼", "神奇的铅笔", "大树的秘密"],
                    "3": ["海底探险记", "山顶的风铃", "魔法书店", "影子朋友"],
                    "4": ["时间的礼物", "云朵邮递员", "奇妙图书馆", "月亮的微笑"],
                    "5": ["城市与森林", "寻找宝藏", "梦想的种子", "古老的钟表"],
                    "6": ["未来的信", "发明家俱乐部", "失落的王国", "星际旅行笔记"]
                };
                console.log('已重置为默认书籍数据');
                localStorage.setItem('booksDatabase', JSON.stringify(booksDatabase));
            }
        } catch (e) {
            console.error('读取本地书籍库数据失败', e);
            // 初始化为默认值
            booksDatabase = {
                "1": ["你为什么不开花", "小兔的帽子", "森林音乐会", "彩虹桥的故事"],
                "2": ["星星的旅行", "小猫钓鱼", "神奇的铅笔", "大树的秘密"],
                "3": ["海底探险记", "山顶的风铃", "魔法书店", "影子朋友"],
                "4": ["时间的礼物", "云朵邮递员", "奇妙图书馆", "月亮的微笑"],
                "5": ["城市与森林", "寻找宝藏", "梦想的种子", "古老的钟表"],
                "6": ["未来的信", "发明家俱乐部", "失落的王国", "星际旅行笔记"]
            };
            console.log('读取失败，已重置为默认书籍数据');
            localStorage.setItem('booksDatabase', JSON.stringify(booksDatabase));
        }
    } else {
        console.log('localStorage中没有书籍数据，使用默认数据');
        // 使用默认值
        booksDatabase = {
            "1": ["你为什么不开花", "小兔的帽子", "森林音乐会", "彩虹桥的故事"],
            "2": ["星星的旅行", "小猫钓鱼", "神奇的铅笔", "大树的秘密"],
            "3": ["海底探险记", "山顶的风铃", "魔法书店", "影子朋友"],
            "4": ["时间的礼物", "云朵邮递员", "奇妙图书馆", "月亮的微笑"],
            "5": ["城市与森林", "寻找宝藏", "梦想的种子", "古老的钟表"],
            "6": ["未来的信", "发明家俱乐部", "失落的王国", "星际旅行笔记"]
        };
        localStorage.setItem('booksDatabase', JSON.stringify(booksDatabase));
    }
    console.log('完成书籍数据加载，最终booksDatabase:', booksDatabase);
}

// 更新从服务器加载数据的函数
async function initAnswersFromServer() {
    try {
        // 获取所有年级的书籍列表
        const books = await api.getBooks();
        booksDatabase = books;
        
        console.log('从服务器加载了书籍列表:', booksDatabase);
        
        // 更新下拉菜单
        initGradeSelection();
        
        return true;
    } catch (error) {
        console.error('初始化数据失败:', error);
        return false;
    }
}

// 从本地存储加载数据
function initAnswersFromLocalStorage() {
    const savedAnswers = localStorage.getItem('answersDatabase');
    if (savedAnswers) {
        try {
            answersDatabase = JSON.parse(savedAnswers);
            console.log('从本地存储加载了答案库数据');
        } catch (e) {
            console.error('读取本地存储数据失败', e);
        }
    }
}

// 加载历史记录
function loadHistoryRecords() {
    const savedRecords = localStorage.getItem('historyRecords');
    if (savedRecords) {
        try {
            historyRecords = JSON.parse(savedRecords);
            console.log('从本地存储加载了历史记录数据');
        } catch (e) {
            console.error('读取历史记录数据失败', e);
        }
    }
}

// 导航初始化
function initNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 移除所有活动状态
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            
            // 添加当前活动状态
            this.classList.add('active');
            const targetPageId = this.getAttribute('data-page');
            document.getElementById(targetPageId).classList.add('active');
        });
    });
}

// 修改书籍选择函数，使用服务器数据
async function populateBookSelect(grade, selectElement) {
    console.log('进入populateBookSelect函数，年级:', grade);
    
    // 检查内存中的数据和localStorage数据是否一致
    const localStorageBooks = localStorage.getItem('booksDatabase');
    if (localStorageBooks) {
        try {
            const parsedBooks = JSON.parse(localStorageBooks);
            const isEqual = JSON.stringify(parsedBooks) === JSON.stringify(booksDatabase);
            console.log('populateBookSelect: 内存与localStorage数据是否一致:', isEqual);
            
            if (!isEqual) {
                console.log('populateBookSelect: 数据不一致，重新加载localStorage数据');
                booksDatabase = parsedBooks;
            }
        } catch (e) {
            console.error('解析localStorage中的booksDatabase失败:', e);
        }
    }
    
    selectElement.innerHTML = '<option value="">请选择书籍</option>';
    selectElement.disabled = !grade;
    
    console.log('populateBookSelect: 当前booksDatabase:', booksDatabase);
    
    if (grade && booksDatabase[grade]) {
        console.log(`populateBookSelect: 年级${grade}的书籍数组:`, booksDatabase[grade]);
        
        booksDatabase[grade].forEach(book => {
            const option = document.createElement('option');
            option.value = book;
            option.textContent = book;
            selectElement.appendChild(option);
            console.log(`populateBookSelect: 添加选项 ${book}`);
        });
        
        console.log(`populateBookSelect: 添加了${booksDatabase[grade].length}个选项`);
    } else {
        console.log(`populateBookSelect: 年级${grade}没有书籍数据`);
    }
}

// 修改书籍选择响应，使用服务器数据
async function onBookSelect(grade, book) {
    if (grade && book) {
        const answers = await api.getFormattedAnswers(grade, book);
        if (answers) {
            const bookKey = `${grade}-${book}`;
            answersDatabase[bookKey] = answers;
            displayQuestionInputs(answers);
        } else {
            alert('该书籍尚未设置标准答案，请先在答案库管理中设置。');
            return false;
        }
    }
    return true;
}

// 修改年级选择初始化函数
function initGradeSelection() {
    const gradeSelect = document.getElementById('grade');
    const bookSelect = document.getElementById('book');
    const manageGradeSelect = document.getElementById('manage-grade');
    const manageBookSelect = document.getElementById('manage-book');
    
    // 答案录入页年级选择
    gradeSelect.addEventListener('change', function() {
        const grade = this.value;
        console.log('答案录入页年级选择变更为:', grade);
        console.log('当前booksDatabase:', booksDatabase);
        if(grade && booksDatabase[grade]) {
            console.log(`年级${grade}的书籍:`, booksDatabase[grade]);
        } else {
            console.log(`年级${grade}没有书籍数据`);
        }
        populateBookSelect(grade, bookSelect);
    });
    
    // 答案库管理页年级选择
    manageGradeSelect.addEventListener('change', function() {
        const grade = this.value;
        console.log('答案库管理页年级选择变更为:', grade);
        console.log('当前booksDatabase:', booksDatabase);
        if(grade && booksDatabase[grade]) {
            console.log(`年级${grade}的书籍:`, booksDatabase[grade]);
        } else {
            console.log(`年级${grade}没有书籍数据`);
        }
        populateBookSelect(grade, manageBookSelect);
    });
    
    // 书籍选择
    bookSelect.addEventListener('change', async function() {
        const grade = gradeSelect.value;
        const book = this.value;
        
        if (grade && book) {
            const bookKey = `${grade}-${book}`;
            if (answersDatabase[bookKey]) {
                displayQuestionInputs(answersDatabase[bookKey]);
            } else {
                alert('该书籍尚未设置标准答案，请先在答案库管理中设置。');
                this.value = '';
            }
        }
    });
    
    // 管理页书籍选择
    manageBookSelect.addEventListener('change', function() {
        const grade = manageGradeSelect.value;
        const book = this.value;
        
        if (grade && book) {
            const bookKey = `${grade}-${book}`;
            if (answersDatabase[bookKey]) {
                displayStandardAnswerInputs(answersDatabase[bookKey]);
            } else {
                // 创建新的答案数据结构，默认15题
                const defaultQuestionCount = 15;
                const emptyAnswers = {
                    questions: Array(defaultQuestionCount).fill(''),
                    options: Array(defaultQuestionCount).fill({A:'', B:'', C:'', D:''}),
                    answers: Array(defaultQuestionCount).fill(''),
                    dimensions: Array(defaultQuestionCount).fill(0),
                    explanations: Array(defaultQuestionCount).fill('')
                };
                displayStandardAnswerInputs(emptyAnswers);
            }
        }
    });
}

// 显示题目输入区域
function displayQuestionInputs(bookData) {
    const container = document.getElementById('answer-inputs');
    container.innerHTML = '';
    
    document.getElementById('questions-container').classList.remove('hidden');
    
    if (bookData && bookData.questions) {
        // 只针对有内容的题目进行显示
        bookData.questions.forEach((question, index) => {
            if (!question) return; // 跳过空题目
            
            const questionCard = document.createElement('div');
            questionCard.className = 'question-card';
            
            const questionText = document.createElement('div');
            questionText.className = 'question-text';
            questionText.textContent = `${index + 1}. ${question}`;
            questionCard.appendChild(questionText);
            
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'options-grid student-options';
            
            const options = bookData.options[index];
            let hasValidOptions = false;
            
            if (options) {
                ['A', 'B', 'C', 'D'].forEach(option => {
                    if (options[option]) {
                        hasValidOptions = true;
                        const optionLabel = document.createElement('label');
                        optionLabel.className = 'option-radio';
                        
                        const radioInput = document.createElement('input');
                        radioInput.type = 'radio';
                        radioInput.name = `answer-${index}`;
                        radioInput.value = option;
                        
                        optionLabel.appendChild(radioInput);
                        optionLabel.appendChild(document.createTextNode(`${option}. ${options[option]}`));
                        
                        optionsContainer.appendChild(optionLabel);
                    }
                });
            }
            
            // 只有当题目有选项时才显示
            if (hasValidOptions) {
                questionCard.appendChild(optionsContainer);
                container.appendChild(questionCard);
            }
        });
    }
}

// 显示标准答案输入区域
function displayStandardAnswerInputs(bookData) {
    const container = document.getElementById('standard-answer-inputs');
    container.innerHTML = '';
    
    document.getElementById('standard-answers-container').classList.remove('hidden');
    
    // 添加表头
    const headerRow = document.createElement('div');
    headerRow.className = 'header-row';
    
    const numberColumn = document.createElement('div');
    numberColumn.className = 'number-column';
    numberColumn.textContent = '题号';
    headerRow.appendChild(numberColumn);
    
    const questionColumn = document.createElement('div');
    questionColumn.className = 'question-column';
    questionColumn.textContent = '题目';
    headerRow.appendChild(questionColumn);
    
    const answerColumn = document.createElement('div');
    answerColumn.className = 'answer-column';
    answerColumn.textContent = '答案';
    headerRow.appendChild(answerColumn);
    
    container.appendChild(headerRow);
    
    if (bookData) {
        // 获取实际题目数量
        let questionCount = 0;
        
        // 通过检查已有题目来确定题目数量
        if (bookData.questions) {
            for (let i = 0; i < bookData.questions.length; i++) {
                if (bookData.questions[i]) {
                    questionCount = Math.max(questionCount, i + 1);
                }
            }
        }
        
        // 通过检查已有答案来确定题目数量
        if (bookData.answers) {
            for (let i = 0; i < bookData.answers.length; i++) {
                if (bookData.answers[i]) {
                    questionCount = Math.max(questionCount, i + 1);
                }
            }
        }
        
        // 如果没有题目，则默认显示15题
        if (questionCount === 0) {
            questionCount = 15;
        }
        
        for (let i = 0; i < questionCount; i++) {
            const questionCard = document.createElement('div');
            questionCard.className = 'question-card';
            questionCard.dataset.index = i;
            
            // 题目头部（始终显示）
            const questionHeader = document.createElement('div');
            questionHeader.className = 'question-header';
            
            const questionTitle = document.createElement('div');
            questionTitle.className = 'question-title';
            
            // 使用格式化的标题
            const numberPart = document.createElement('span');
            numberPart.className = 'number-part';
            numberPart.textContent = `${i + 1}.`;
            questionTitle.appendChild(numberPart);
            
            // 题目文本
            const textPart = document.createTextNode(
                bookData.questions && bookData.questions[i] 
                    ? ` ${bookData.questions[i].substring(0, 20)}${bookData.questions[i].length > 20 ? '...' : ''}`
                    : ' 未设置'
            );
            questionTitle.appendChild(textPart);
            
            // 答案显示
            if (bookData.answers && bookData.answers[i]) {
                const answerPart = document.createElement('span');
                answerPart.className = 'answer-part';
                answerPart.textContent = `[${bookData.answers[i]}]`;
                questionTitle.appendChild(answerPart);
            }
            
            const toggleIcon = document.createElement('div');
            toggleIcon.className = 'toggle-icon';
            toggleIcon.textContent = '▼';
            
            questionHeader.appendChild(questionTitle);
            questionHeader.appendChild(toggleIcon);
            questionCard.appendChild(questionHeader);
            
            // 题目详情（默认隐藏）
            const questionDetails = document.createElement('div');
            questionDetails.className = 'question-details';
            
            // 题目输入
            const questionInput = document.createElement('div');
            questionInput.className = 'form-group compact-form';
            
            const questionLabel = document.createElement('label');
            questionLabel.textContent = `题目`;
            questionInput.appendChild(questionLabel);
            
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'question-input';
            textInput.dataset.index = i;
            textInput.value = bookData.questions[i] || '';
            textInput.placeholder = '请输入题目内容';
            questionInput.appendChild(textInput);
            
            questionDetails.appendChild(questionInput);
            
            // 选项容器 - 使用网格布局
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'options-grid';
            
            // 选项输入
            const options = bookData.options[i] || {A: '', B: '', C: '', D: ''};
            ['A', 'B', 'C', 'D'].forEach(option => {
                const optionInput = document.createElement('div');
                optionInput.className = 'form-group compact-form';
                
                const optionLabel = document.createElement('label');
                optionLabel.textContent = `${option}`;
                optionInput.appendChild(optionLabel);
                
                const optTextInput = document.createElement('input');
                optTextInput.type = 'text';
                optTextInput.className = `option-input option-${option}`;
                optTextInput.dataset.index = i;
                optTextInput.dataset.option = option;
                optTextInput.value = options[option] || '';
                optTextInput.placeholder = `请输入选项 ${option} 内容`;
                optionInput.appendChild(optTextInput);
                
                optionsContainer.appendChild(optionInput);
            });
            
            questionDetails.appendChild(optionsContainer);
            
            // 答案和维度容器 - 使用网格布局
            const settingsContainer = document.createElement('div');
            settingsContainer.className = 'settings-grid';
            
            // 正确答案选择
            const answerSelect = document.createElement('div');
            answerSelect.className = 'form-group compact-form';
            
            const answerLabel = document.createElement('label');
            answerLabel.textContent = '答案';
            answerSelect.appendChild(answerLabel);
            
            const selectInput = document.createElement('select');
            selectInput.className = 'answer-select';
            selectInput.dataset.index = i;
            
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '请选择正确答案';
            selectInput.appendChild(defaultOption);
            
            ['A', 'B', 'C', 'D'].forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option;
                if (bookData.answers && bookData.answers[i] === option) {
                    optionElement.selected = true;
                }
                selectInput.appendChild(optionElement);
            });
            
            answerSelect.appendChild(selectInput);
            settingsContainer.appendChild(answerSelect);
            
            // 能力维度选择
            const dimensionSelect = document.createElement('div');
            dimensionSelect.className = 'form-group compact-form';
            
            const dimensionLabel = document.createElement('label');
            dimensionLabel.textContent = '能力维度';
            dimensionSelect.appendChild(dimensionLabel);
            
            const dimSelectInput = document.createElement('select');
            dimSelectInput.className = 'dimension-select';
            dimSelectInput.dataset.index = i;
            
            dimensionNames.forEach((name, index) => {
                const dimOption = document.createElement('option');
                dimOption.value = index;
                dimOption.textContent = name;
                if (bookData.dimensions && bookData.dimensions[i] === index) {
                    dimOption.selected = true;
                }
                dimSelectInput.appendChild(dimOption);
            });
            
            dimensionSelect.appendChild(dimSelectInput);
            settingsContainer.appendChild(dimensionSelect);
            
            questionDetails.appendChild(settingsContainer);
            
            // 解析输入
            const explanationInput = document.createElement('div');
            explanationInput.className = 'form-group compact-form';
            
            const explanationLabel = document.createElement('label');
            explanationLabel.textContent = '解析';
            explanationInput.appendChild(explanationLabel);
            
            const explTextInput = document.createElement('input');
            explTextInput.type = 'text';
            explTextInput.className = 'explanation-input';
            explTextInput.dataset.index = i;
            explTextInput.value = bookData.explanations[i] || '';
            explTextInput.placeholder = '请输入题目解析';
            explanationInput.appendChild(explTextInput);
            
            questionDetails.appendChild(explanationInput);
            
            // 添加详情到卡片
            questionCard.appendChild(questionDetails);
            
            // 修改点击事件
            questionHeader.addEventListener('click', function(e) {
                // 如果点击的是输入框或选择框，不触发折叠/展开
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') {
                    return;
                }
                
                questionCard.classList.toggle('expanded');
                // 更新图标
                toggleIcon.textContent = questionCard.classList.contains('expanded') ? '▲' : '▼';
            });
            
            container.appendChild(questionCard);
        }
    }
}

// 设置答案提交
function setupAnswerSubmission() {
    const submitButton = document.getElementById('submit-answers');
    
    submitButton.addEventListener('click', function() {
        const name = document.getElementById('student-name').value;
        const grade = document.getElementById('grade').value;
        const book = document.getElementById('book').value;
        const answerInputs = document.querySelectorAll('input[type="radio"]:checked');
        
        if (!name || !grade || !book) {
            alert('请填写学生信息和选择书籍！');
            return;
        }
        
        if (answerInputs.length === 0) {
            alert('请至少回答一道题目！');
            return;
        }
        
        const studentAnswers = [];
        answerInputs.forEach(input => {
            const questionIndex = parseInt(input.name.replace('answer-', ''));
            studentAnswers[questionIndex] = input.value;
        });
        
        const bookKey = `${grade}-${book}`;
        const standardAnswers = answersDatabase[bookKey];
        
        if (!standardAnswers) {
            alert('未找到该书籍的标准答案！');
            return;
        }
        
        const evaluation = evaluateAnswers(studentAnswers, standardAnswers);
        
        // 保存历史记录
        saveHistoryRecord(name, grade, book, evaluation);
        
        // 显示报告
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById('report-page').classList.add('active');
        document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));
        document.querySelector('nav a[data-page="report-page"]').classList.add('active');
        
        // 生成报告
        generateReport(name, grade, book, evaluation);
    });
}

// 保存历史记录
function saveHistoryRecord(studentName, grade, book, evaluation) {
    const date = new Date();
    const record = {
        id: Date.now(),
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
        studentName,
        grade,
        book,
        accuracy: Math.round((evaluation.correctCount / evaluation.totalQuestions) * 100),
        dimensionRates: evaluation.dimensionRates,
        correctCount: evaluation.correctCount,
        totalQuestions: evaluation.totalQuestions
    };
    
    historyRecords.push(record);
    localStorage.setItem('historyRecords', JSON.stringify(historyRecords));
    
    // 更新历史记录显示
    displayHistoryRecords();
}

// 显示历史记录
function displayHistoryRecords() {
    const recordsContainer = document.getElementById('history-records');
    if (!recordsContainer) return;
    
    recordsContainer.innerHTML = '';
    
    if (historyRecords.length === 0) {
        recordsContainer.innerHTML = '<p class="no-records">暂无历史记录</p>';
        return;
    }
    
    // 创建表格
    const table = document.createElement('table');
    table.className = 'history-table';
    
    // 表头
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>日期</th>
            <th>学生</th>
            <th>年级-书籍</th>
            <th>正确率</th>
            <th>操作</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // 表格内容
    const tbody = document.createElement('tbody');
    
    // 按时间倒序排序
    const sortedRecords = [...historyRecords].sort((a, b) => b.id - a.id);
    
    sortedRecords.forEach(record => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${record.date} ${record.time}</td>
            <td>${record.studentName}</td>
            <td>${record.grade}年级 - ${record.book}</td>
            <td>${record.accuracy}%</td>
            <td>
                <button class="view-record-btn" data-id="${record.id}">查看</button>
                <button class="delete-record-btn" data-id="${record.id}">删除</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    recordsContainer.appendChild(table);
    
    // 添加事件监听
    document.querySelectorAll('.view-record-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const recordId = parseInt(this.getAttribute('data-id'));
            viewHistoryRecord(recordId);
        });
    });
    
    document.querySelectorAll('.delete-record-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const recordId = parseInt(this.getAttribute('data-id'));
            deleteHistoryRecord(recordId);
        });
    });
}

// 查看历史记录
function viewHistoryRecord(recordId) {
    const record = historyRecords.find(r => r.id === recordId);
    if (!record) return;
    
    // 切换到报告页面
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('report-page').classList.add('active');
    document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));
    document.querySelector('nav a[data-page="report-page"]').classList.add('active');
    
    // 设置学生信息
    document.getElementById('report-student-name').textContent = `${record.studentName} 同学`;
    document.getElementById('report-book-info').textContent = `${record.grade}年级 - ${record.book}`;
    document.getElementById('report-date').textContent = `测评日期: ${record.date}`;
    
    // 显示准确率
    document.getElementById('accuracy-rate').textContent = `${record.accuracy}%`;
    
    // 绘制雷达图
    const dimensionValues = [];
    const dimensionLabels = [];
    
    record.dimensionRates.forEach((rate, index) => {
        dimensionValues.push(Math.round(rate * 100));
        dimensionLabels.push(dimensionNames[index]);
    });
    
    const ctx = document.getElementById('radar-chart').getContext('2d');
    
    // 销毁已存在的图表
    if (window.radarChart) {
        window.radarChart.destroy();
    }
    
    window.radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: dimensionLabels,
            datasets: [{
                label: '阅读能力评价',
                data: dimensionValues,
                backgroundColor: 'rgba(0, 113, 227, 0.2)',
                borderColor: 'rgba(0, 113, 227, 1)',
                pointBackgroundColor: 'rgba(0, 113, 227, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(0, 113, 227, 1)'
            }]
        },
        options: {
            scale: {
                ticks: {
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: {
                            size: 14
                        }
                    }
                }
            },
            scales: {
                r: {
                    pointLabels: {
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
    
    // 显示报告
    document.getElementById('report-container').classList.remove('hidden');
}

// 删除历史记录
function deleteHistoryRecord(recordId) {
    if (confirm('确定要删除这条记录吗？')) {
        historyRecords = historyRecords.filter(r => r.id !== recordId);
        localStorage.setItem('historyRecords', JSON.stringify(historyRecords));
        displayHistoryRecords();
    }
}

// 生成报告
function generateReport(studentName, grade, book, evaluation) {
    // 设置学生信息
    document.getElementById('report-student-name').textContent = `${studentName} 同学`;
    document.getElementById('report-book-info').textContent = `${grade}年级 - ${book}`;
    document.getElementById('report-date').textContent = `测评日期: ${new Date().toLocaleDateString()}`;
    
    // 显示准确率
    const accuracyRate = Math.round((evaluation.correctCount / evaluation.totalQuestions) * 100);
    document.getElementById('accuracy-rate').textContent = `${accuracyRate}%`;
    
    // 绘制雷达图
    generateRadarChart(evaluation);
    
    // 生成维度详细分析
    generateDimensionDetails(evaluation);
    
    // 生成错题分析
    generateWrongQuestionsList(evaluation);
    
    // 生成进步情况分析
    generateProgressAnalysis(studentName, grade, book, evaluation);
    
    // 生成改进建议
    generateSuggestions(evaluation);
    
    // 显示报告
    document.getElementById('report-container').classList.remove('hidden');
}

// 生成进步情况分析
function generateProgressAnalysis(studentName, grade, book, evaluation) {
    const progressContainer = document.getElementById('progress-analysis');
    progressContainer.innerHTML = '';
    
    // 查找该学生的历史记录
    const studentRecords = historyRecords.filter(r => 
        r.studentName === studentName && 
        r.grade === grade && 
        r.book === book &&
        r.id !== Date.now() // 排除当前记录
    );
    
    if (studentRecords.length === 0) {
        const noDataMessage = document.createElement('p');
        noDataMessage.textContent = '这是首次测评，暂无历史数据进行对比。';
        progressContainer.appendChild(noDataMessage);
        return;
    }
    
    // 按时间排序
    studentRecords.sort((a, b) => a.id - b.id);
    const lastRecord = studentRecords[studentRecords.length - 1];
    
    // 计算整体准确率变化
    const currentAccuracy = Math.round((evaluation.correctCount / evaluation.totalQuestions) * 100);
    const lastAccuracy = lastRecord.accuracy;
    const accuracyChange = currentAccuracy - lastAccuracy;
    
    // 总体进步情况
    const overallProgress = document.createElement('div');
    overallProgress.className = 'progress-item';
    
    const progressTitle = document.createElement('h4');
    progressTitle.textContent = '总体进步情况';
    overallProgress.appendChild(progressTitle);
    
    const progressDesc = document.createElement('p');
    if (accuracyChange > 0) {
        progressDesc.innerHTML = `相比上次测评，准确率<span class="progress-positive">提高了 ${accuracyChange}%</span>`;
    } else if (accuracyChange < 0) {
        progressDesc.innerHTML = `相比上次测评，准确率<span class="progress-negative">下降了 ${Math.abs(accuracyChange)}%</span>`;
    } else {
        progressDesc.innerHTML = `相比上次测评，准确率<span class="progress-neutral">保持不变</span>`;
    }
    overallProgress.appendChild(progressDesc);
    
    // 维度进步情况
    const dimensionProgress = document.createElement('div');
    dimensionProgress.className = 'progress-item';
    
    const dimensionTitle = document.createElement('h4');
    dimensionTitle.textContent = '各维度进步情况';
    dimensionProgress.appendChild(dimensionTitle);
    
    const dimensionList = document.createElement('ul');
    dimensionList.className = 'dimension-progress-list';
    
    // 比较各维度的进步情况
    evaluation.dimensionRates.forEach((currentRate, index) => {
        if (evaluation.dimensionCounts[index] > 0) { // 只处理有数据的维度
            const lastRate = lastRecord.dimensionRates[index] || 0;
            const rateChange = currentRate - lastRate;
            const rateChangePercent = Math.round(rateChange * 100);
            
            if (rateChangePercent !== 0) {
                const dimensionItem = document.createElement('li');
                
                if (rateChangePercent > 0) {
                    dimensionItem.innerHTML = `<strong>${dimensionNames[index]}</strong>: <span class="progress-positive">提高了 ${rateChangePercent}%</span>`;
                } else {
                    dimensionItem.innerHTML = `<strong>${dimensionNames[index]}</strong>: <span class="progress-negative">下降了 ${Math.abs(rateChangePercent)}%</span>`;
                }
                
                dimensionList.appendChild(dimensionItem);
            }
        }
    });
    
    if (dimensionList.children.length === 0) {
        const noChangeItem = document.createElement('li');
        noChangeItem.textContent = '各维度能力变化不明显';
        dimensionList.appendChild(noChangeItem);
    }
    
    dimensionProgress.appendChild(dimensionList);
    
    // 添加到容器
    progressContainer.appendChild(overallProgress);
    progressContainer.appendChild(dimensionProgress);
}

// 设置标准答案保存
function setupStandardAnswersSave() {
    const saveButton = document.getElementById('save-standard-answers');
    
    saveButton.addEventListener('click', function() {
        const grade = document.getElementById('manage-grade').value;
        const book = document.getElementById('manage-book').value;
        
        if (!grade || !book) {
            alert('请选择年级和书籍！');
            return;
        }
        
        const bookKey = `${grade}-${book}`;
        
        // 获取所有题目、选项和答案
        const questions = [];
        const options = [];
        const answers = [];
        const dimensions = [];
        const explanations = [];
        
        // 获取实际题目卡片数量
        const questionCards = document.querySelectorAll('.question-card');
        
        questionCards.forEach(card => {
            const index = parseInt(card.dataset.index);
            
            // 题目
            const questionInput = card.querySelector('.question-input');
            questions[index] = questionInput ? questionInput.value : '';
            
            // 选项
            const optionInputs = {
                A: card.querySelector('.option-A'),
                B: card.querySelector('.option-B'),
                C: card.querySelector('.option-C'),
                D: card.querySelector('.option-D')
            };
            
            options[index] = {
                A: optionInputs.A ? optionInputs.A.value : '',
                B: optionInputs.B ? optionInputs.B.value : '',
                C: optionInputs.C ? optionInputs.C.value : '',
                D: optionInputs.D ? optionInputs.D.value : ''
            };
            
            // 答案
            const answerSelect = card.querySelector('.answer-select');
            answers[index] = answerSelect ? answerSelect.value : '';
            
            // 维度
            const dimensionSelect = card.querySelector('.dimension-select');
            dimensions[index] = dimensionSelect ? parseInt(dimensionSelect.value) : 0;
            
            // 解析
            const explanationInput = card.querySelector('.explanation-input');
            explanations[index] = explanationInput ? explanationInput.value : '';
        });
        
        // 检查必填内容，只检查实际存在的题目卡片
        for (let i = 0; i < questionCards.length; i++) {
            const index = parseInt(questionCards[i].dataset.index);
            
            if (questions[index] && !answers[index]) {
                const confirmResult = confirm(`题目 ${index+1} 缺少正确答案，是否继续保存？`);
                if (!confirmResult) {
                    questionCards[i].scrollIntoView();
                    questionCards[i].classList.add('expanded');
                    questionCards[i].classList.add('highlight');
                    
                    // 移除高亮
                    setTimeout(() => {
                        questionCards[i].classList.remove('highlight');
                    }, 3000);
                    
                    return;
                }
            }
            
            // 如果有答案但没有题目，检查是否确实要保存
            if (!questions[index] && answers[index]) {
                const confirmResult = confirm(`答案 ${index+1} 缺少题目内容，是否继续保存？`);
                if (!confirmResult) {
                    return;
                }
            }
        }
        
        // 保存数据
        answersDatabase[bookKey] = {
            questions: questions,
            answers: answers,
            dimensions: dimensions,
            options: options,
            explanations: explanations
        };
        
        // 保存到本地存储
        localStorage.setItem('answersDatabase', JSON.stringify(answersDatabase));
        
        alert('标准答案保存成功！');
    });
}

// 设置数据导出和导入功能
function setupDataExportImport() {
    // 创建导出按钮
    const exportDataSection = document.createElement('div');
    exportDataSection.className = 'data-export-import-container';
    exportDataSection.innerHTML = `
        <h3>数据导出/导入</h3>
        <p class="instruction">导出所有答案库数据，便于备份或跨设备迁移</p>
        <div class="buttons-container">
            <button id="export-data-btn" class="secondary-btn">导出所有数据</button>
            <button id="import-data-btn" class="secondary-btn">导入数据文件</button>
            <input type="file" id="import-data-file" accept=".json" style="display:none">
        </div>
        <div id="export-status" style="margin-top: 10px;"></div>
    `;
    
    // 添加到答案库管理页面
    const answerManagement = document.getElementById('answer-management');
    answerManagement.insertBefore(exportDataSection, document.querySelector('.excel-import-container'));
    
    // 设置导出功能
    document.getElementById('export-data-btn').addEventListener('click', function() {
        const exportData = {
            booksDatabase: booksDatabase,
            answersDatabase: answersDatabase,
            exportTime: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `reading-assessment-data-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        // 显示状态
        document.getElementById('export-status').innerHTML = `
            <div class="success-message">数据导出成功！ 文件名: ${a.download}</div>
        `;
    });
    
    // 设置导入功能
    document.getElementById('import-data-btn').addEventListener('click', function() {
        document.getElementById('import-data-file').click();
    });
    
    document.getElementById('import-data-file').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                
                // 验证导入的数据
                if (!importedData.booksDatabase || !importedData.answersDatabase) {
                    throw new Error('数据格式无效');
                }
                
                // 导入数据
                booksDatabase = importedData.booksDatabase;
                answersDatabase = importedData.answersDatabase;
                
                // 保存到本地存储
                localStorage.setItem('booksDatabase', JSON.stringify(booksDatabase));
                localStorage.setItem('answersDatabase', JSON.stringify(answersDatabase));
                
                // 刷新界面
                initGradeSelection();
                
                document.getElementById('export-status').innerHTML = `
                    <div class="success-message">
                        数据导入成功！导入了 ${Object.keys(importedData.answersDatabase).length} 本书的数据。
                    </div>
                `;
            } catch (error) {
                document.getElementById('export-status').innerHTML = `
                    <div class="error-message">导入失败: ${error.message}</div>
                `;
            }
            
            // 清空文件输入
            this.value = '';
        };
        
        reader.readAsText(file);
    });
}

// 添加答案统计功能
function setupAnswerStats() {
    // ... existing code ...
}

// 添加自定义调试函数
function debugBooksDatabase() {
    console.log('==== 调试书籍数据库 ====');
    console.log('booksDatabase 数据:', booksDatabase);
    
    // 检查localStorage中的数据
    const localStorageBooks = localStorage.getItem('booksDatabase');
    if (localStorageBooks) {
        try {
            const parsedBooks = JSON.parse(localStorageBooks);
            console.log('localStorage中的booksDatabase:', parsedBooks);
            
            // 检查数据是否一致
            const isEqual = JSON.stringify(parsedBooks) === JSON.stringify(booksDatabase);
            console.log('内存与localStorage数据是否一致:', isEqual);
            
            if (!isEqual) {
                console.log('数据不一致，重新加载localStorage数据');
                booksDatabase = parsedBooks;
                console.log('重新加载后的booksDatabase:', booksDatabase);
            }
        } catch (e) {
            console.error('解析localStorage中的booksDatabase失败:', e);
        }
    } else {
        console.log('localStorage中没有booksDatabase数据');
    }
    console.log('==== 调试结束 ====');
}

// 设置Excel批量导入功能
function setupExcelImport() {
    const importBtn = document.getElementById('import-excel-btn');
    const fileInput = document.getElementById('excel-files');
    
    // 确保找到元素
    if (!importBtn || !fileInput) return;
    
    importBtn.addEventListener('click', async function() {
        const files = fileInput.files;
        if (files.length === 0) {
            alert('请先选择Excel文件');
            return;
        }
        
        // 显示加载提示
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner"></div>
            <p>正在处理文件，请稍候...</p>
            <div class="import-progress">
                <div class="import-progress-bar">
                    <div class="import-progress-bar-fill" style="width: 0%"></div>
                </div>
                <div class="import-status">已导入: 0/${files.length}</div>
            </div>
            <div class="imported-files-list"></div>
        `;
        document.body.appendChild(loadingOverlay);
        
        // 获取进度条和状态显示元素
        const progressBar = loadingOverlay.querySelector('.import-progress-bar-fill');
        const statusText = loadingOverlay.querySelector('.import-status');
        const filesList = loadingOverlay.querySelector('.imported-files-list');
        
        // 处理每个文件
        let processedCount = 0;
        let successCount = 0;
        let importedBooks = []; // 存储成功导入的书籍信息
        
        // 处理所有文件
        for (const file of files) {
            try {
                // 解析文件名获取年级和书籍信息
                const fileInfo = parseFileName(file.name);
                if (!fileInfo) {
                    updateFileStatus(file.name, '文件名格式错误', false);
                    processedCount++;
                    updateExcelImportProgress(progressBar, statusText, processedCount, files.length);
                    continue;
                }
                
                // 读取Excel文件内容
                const data = await readExcelFile(file);
                
                // 处理Excel数据
                if (data && data.length > 0) {
                    const bookKey = `${fileInfo.grade}-${fileInfo.book}`;
                    
                    // 准备数据数组
                    const answers = [];
                    const dimensions = [];
                    const questions = [];
                    const options = [];
                    const explanations = [];
                    
                    // 处理每一行数据
                    data.forEach(row => {
                        // 找出题号列
                        const numberKey = findKey(row, ['number', '题号', '题目序号', 'id']);
                        if (!numberKey || !row[numberKey]) return;
                        
                        const index = parseInt(row[numberKey]) - 1;
                        if (isNaN(index)) return;
                        
                        // 找出答案列
                        const answerKey = findKey(row, ['answer', '答案', '正确答案']);
                        if (answerKey && row[answerKey]) {
                            answers[index] = row[answerKey].toString().trim().toUpperCase();
                        }
                        
                        // 找出维度列
                        const dimensionKey = findKey(row, ['dimension', '维度', '能力维度']);
                        if (dimensionKey && row[dimensionKey]) {
                            const dimensionMap = {
                                '获取信息维度': 0,
                                '整体感知维度': 1,
                                '解释推断维度': 2,
                                '评价鉴赏维度': 3,
                                '转化运用维度': 4
                            };
                            dimensions[index] = dimensionMap[row[dimensionKey]] !== undefined ? 
                                dimensionMap[row[dimensionKey]] : 0;
                        }
                        
                        // 找出题目列
                        const questionKey = findKey(row, ['question', '题目', '问题']);
                        if (questionKey && row[questionKey]) {
                            questions[index] = row[questionKey].toString();
                        }
                        
                        // 找出选项列
                        const optA = findKey(row, ['optionA', 'A', 'A选项', '选项A']);
                        const optB = findKey(row, ['optionB', 'B', 'B选项', '选项B']);
                        const optC = findKey(row, ['optionC', 'C', 'C选项', '选项C']);
                        const optD = findKey(row, ['optionD', 'D', 'D选项', '选项D']);
                        
                        options[index] = {
                            A: optA && row[optA] ? row[optA].toString() : '',
                            B: optB && row[optB] ? row[optB].toString() : '',
                            C: optC && row[optC] ? row[optC].toString() : '',
                            D: optD && row[optD] ? row[optD].toString() : ''
                        };
                        
                        // 找出解析列
                        const explKey = findKey(row, ['explanation', '解析', '题目解析']);
                        if (explKey && row[explKey]) {
                            explanations[index] = row[explKey].toString();
                        }
                    });
                    
                    // 检查是否有有效数据
                    if (answers.length > 0) {
                        // 获取有效题目的最大索引
                        let maxIndex = 0;
                        
                        // 检查所有数据数组，找出最大题目索引
                        for (let i = 0; i < Math.max(answers.length, questions.length); i++) {
                            if (answers[i] || (questions[i] && questions[i].trim())) {
                                maxIndex = i;
                            }
                        }
                        
                        // 截取数组到实际题目的最大位置
                        const actualQuestionCount = maxIndex + 1;
                        
                        // 保存到答案库，只保留实际题目
                        answersDatabase[bookKey] = {
                            answers: answers.slice(0, actualQuestionCount),
                            dimensions: dimensions.slice(0, actualQuestionCount),
                            questions: questions.slice(0, actualQuestionCount),
                            options: options.slice(0, actualQuestionCount),
                            explanations: explanations.slice(0, actualQuestionCount)
                        };
                        
                        // 添加书籍到书籍库
                        if (!booksDatabase[fileInfo.grade]) {
                            booksDatabase[fileInfo.grade] = [];
                        }
                        if (!booksDatabase[fileInfo.grade].includes(fileInfo.book)) {
                            booksDatabase[fileInfo.grade].push(fileInfo.book);
                        }
                        
                        // 保存到本地存储
                        localStorage.setItem('answersDatabase', JSON.stringify(answersDatabase));
                        localStorage.setItem('booksDatabase', JSON.stringify(booksDatabase));
                        
                        console.log(`导入文件 ${file.name} 后，年级${fileInfo.grade}的书籍:`, booksDatabase[fileInfo.grade]);
                        console.log('当前完整的booksDatabase:', booksDatabase);
                        
                        updateFileStatus(file.name, '导入成功', true);
                        successCount++;
                        
                        // 记录导入的书籍信息，为后续自动选择做准备
                        importedBooks.push({
                            grade: fileInfo.grade,
                            book: fileInfo.book
                        });
                    } else {
                        updateFileStatus(file.name, '未找到有效数据', false);
                    }
                } else {
                    updateFileStatus(file.name, '文件为空或格式错误', false);
                }
                
                processedCount++;
                updateExcelImportProgress(progressBar, statusText, processedCount, files.length);
            } catch (error) {
                console.error('处理文件错误:', error);
                updateFileStatus(file.name, '处理出错: ' + error.message, false);
                processedCount++;
                updateExcelImportProgress(progressBar, statusText, processedCount, files.length);
            }
        }
        
        // 完成导入
        progressBar.style.width = '100%';
        statusText.textContent = `导入完成: ${successCount}/${files.length} 成功`;
        statusText.classList.add('import-complete');
        
        // 调试书籍数据库
        debugBooksDatabase();
        
        // 延迟移除加载覆盖层
        setTimeout(() => {
            document.body.removeChild(loadingOverlay);
            
            // 再次调试书籍数据库
            debugBooksDatabase();
            
            // 刷新所有下拉框选项
            initGradeSelection();
            console.log('Excel导入完成后，刷新下拉框前的booksDatabase:', booksDatabase);
            
            // 自动选择最后导入的书籍
            if (importedBooks.length > 0) {
                const lastImported = importedBooks[importedBooks.length - 1];
                
                // 切换到答案库管理标签页
                const answerManagementTab = document.querySelector('nav a[data-page="answer-management"]');
                if (answerManagementTab) {
                    answerManagementTab.click();
                }
                
                // 在答案库管理页自动选择导入的年级和书籍
                const manageGradeSelect = document.getElementById('manage-grade');
                const manageBookSelect = document.getElementById('manage-book');
                
                if (manageGradeSelect && manageBookSelect) {
                    // 设置年级选择器值并触发change事件
                    manageGradeSelect.value = lastImported.grade;
                    // 手动触发change事件
                    const event = new Event('change');
                    manageGradeSelect.dispatchEvent(event);
                    
                    // 等待书籍下拉框更新后，再选择书籍
                    setTimeout(() => {
                        manageBookSelect.value = lastImported.book;
                        manageBookSelect.dispatchEvent(new Event('change'));
                        
                        // 自动显示导入的书籍的标准答案
                        const bookKey = `${lastImported.grade}-${lastImported.book}`;
                        if (answersDatabase[bookKey]) {
                            // 显示标准答案容器
                            const standardAnswersContainer = document.getElementById('standard-answers-container');
                            if (standardAnswersContainer) {
                                standardAnswersContainer.classList.remove('hidden');
                            }
                            displayStandardAnswerInputs(answersDatabase[bookKey]);
                        }
                    }, 300); // 增加延迟时间，确保下拉框已更新完成
                }
            }
            
            // 提示用户
            if (successCount > 0) {
                alert(`成功导入${successCount}个Excel文件的答案数据`);
                
                // 更新年级下拉菜单
                const gradeSelect = document.getElementById('grade');
                const manageGradeSelect = document.getElementById('manage-grade');
                
                // 更新书籍下拉菜单
                if (importedBooks.length > 0) {
                    // 自动选择最后导入的书籍的年级
                    const lastImported = importedBooks[importedBooks.length - 1];
                    
                    // 在答案录入页选择书籍
                    if (gradeSelect) {
                        gradeSelect.value = lastImported.grade;
                        gradeSelect.dispatchEvent(new Event('change'));
                        
                        setTimeout(() => {
                            const bookSelect = document.getElementById('book');
                            if (bookSelect) {
                                bookSelect.value = lastImported.book;
                                bookSelect.dispatchEvent(new Event('change'));
                            }
                        }, 100);
                    }
                    
                    // 在答案库管理页选择书籍
                    if (manageGradeSelect) {
                        manageGradeSelect.value = lastImported.grade;
                        manageGradeSelect.dispatchEvent(new Event('change'));
                        
                        setTimeout(() => {
                            const manageBookSelect = document.getElementById('manage-book');
                            if (manageBookSelect) {
                                manageBookSelect.value = lastImported.book;
                                manageBookSelect.dispatchEvent(new Event('change'));
                            }
                        }, 100);
                    }
                }
            }
        }, 2000);
        
        // 更新文件导入状态
        function updateFileStatus(fileName, status, success) {
            const fileItem = document.createElement('div');
            fileItem.className = 'imported-file-item';
            fileItem.innerHTML = `
                <div class="imported-file-name">${fileName}</div>
                <div class="imported-file-status ${success ? 'success' : 'error'}">${status}</div>
            `;
            filesList.appendChild(fileItem);
        }
    });
}

// 更新Excel导入进度
function updateExcelImportProgress(progressBar, statusText, current, total) {
    const percent = Math.round((current / total) * 100);
    progressBar.style.width = `${percent}%`;
    statusText.textContent = `已导入: ${current}/${total}`;
}

// 从文件名解析年级和书籍信息
function parseFileName(fileName) {
    // 移除扩展名
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    
    // 尝试按格式解析：年级-书籍.xlsx
    const match = nameWithoutExt.match(/^(\d+)[_\-\s]+(.+)$/);
    if (match) {
        return {
            grade: match[1],
            book: match[2]
        };
    }
    
    return null;
}

// 查找Excel中的特定列
function findKey(row, possibleKeys) {
    for (const key of possibleKeys) {
        if (row[key] !== undefined) {
            return key;
        }
    }
    return null;
}

// 读取Excel文件并转换为JSON
async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, {type: 'binary'});
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                resolve(json);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function(error) {
            reject(error);
        };
        
        reader.readAsBinaryString(file);
    });
}

// 修改刷新按钮函数
function setupRefreshButtons() {
    // 答案库刷新按钮
    const reloadAnswerBtn = document.getElementById('reload-answer-database');
    if (reloadAnswerBtn) {
        reloadAnswerBtn.addEventListener('click', async function() {
            const success = await initAnswersFromServer();
            if (success) {
                alert('已重新加载答案库');
                
                // 如果当前有选中的年级和书籍，刷新显示
                const manageGradeSelect = document.getElementById('manage-grade');
                const manageBookSelect = document.getElementById('manage-book');
                
                if (manageGradeSelect.value && manageBookSelect.value) {
                    const answers = await api.getFormattedAnswers(manageGradeSelect.value, manageBookSelect.value);
                    if (answers) {
                        const bookKey = `${manageGradeSelect.value}-${manageBookSelect.value}`;
                        answersDatabase[bookKey] = answers;
                        displayStandardAnswerInputs(answers);
                    }
                }
            } else {
                alert('重新加载答案库失败');
            }
        });
    }
}

// 修改书籍管理页面的显示函数
function displayBooks(grade) {
    const booksContainer = document.getElementById('books-list');
    booksContainer.innerHTML = '';
    
    if (!grade) {
        booksContainer.innerHTML = '<p class="empty-books-message">请先选择年级</p>';
        return;
    }
    
    // 获取书籍数据
    const books = booksDatabase[grade] || [];
    
    if (books.length === 0) {
        booksContainer.innerHTML = '<p class="empty-books-message">该年级暂无书籍</p>';
        return;
    }
    
    // 创建书籍卡片
    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        
        const bookTitle = document.createElement('div');
        bookTitle.className = 'book-title';
        bookTitle.textContent = book;
        bookCard.appendChild(bookTitle);
        
        const actionDiv = document.createElement('div');
        actionDiv.className = 'book-actions';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-book-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = '删除此书籍';
        deleteBtn.addEventListener('click', function() {
            if (confirm(`确定要删除${grade}年级的《${book}》吗？`)) {
                // 从数组中删除
                const index = booksDatabase[grade].indexOf(book);
                if (index > -1) {
                    booksDatabase[grade].splice(index, 1);
                }
                
                // 删除相关答案库
                const bookKey = `${grade}-${book}`;
                if (answersDatabase[bookKey]) {
                    delete answersDatabase[bookKey];
                }
                
                // 保存到本地存储
                localStorage.setItem('booksDatabase', JSON.stringify(booksDatabase));
                localStorage.setItem('answersDatabase', JSON.stringify(answersDatabase));
                
                // 刷新显示
                displayBooks(grade);
                alert(`已成功删除${grade}年级的《${book}》`);
            }
        });
        
        actionDiv.appendChild(deleteBtn);
        bookCard.appendChild(actionDiv);
        
        booksContainer.appendChild(bookCard);
    });
}

// 评估答案
function evaluateAnswers(studentAnswers, standardAnswers) {
    const result = {
        totalQuestions: 0,
        correctCount: 0,
        incorrectQuestions: [],
        dimensionScores: [0, 0, 0, 0, 0],
        dimensionCounts: [0, 0, 0, 0, 0]
    };
    
    standardAnswers.questions.forEach((question, index) => {
        if (!question) return; // 跳过空题目
        
        result.totalQuestions++;
        const dimension = standardAnswers.dimensions[index] || 0;
        result.dimensionCounts[dimension]++;
        
        if (studentAnswers[index] === standardAnswers.answers[index]) {
            result.correctCount++;
            result.dimensionScores[dimension]++;
        } else {
            result.incorrectQuestions.push({
                index: index,
                question: question,
                studentAnswer: studentAnswers[index],
                correctAnswer: standardAnswers.answers[index],
                dimension: dimension,
                options: standardAnswers.options[index],
                explanation: standardAnswers.explanations[index]
            });
        }
    });
    
    // 计算维度得分率
    result.dimensionRates = result.dimensionCounts.map((count, index) => {
        return count > 0 ? result.dimensionScores[index] / count : 0;
    });
    
    return result;
}

// 绘制雷达图
function generateRadarChart(evaluation) {
    const dimensionValues = [];
    const dimensionLabels = [];
    
    for (let i = 0; i < 5; i++) {
        if (evaluation.dimensionCounts[i] > 0) {
            const rate = evaluation.dimensionScores[i] / evaluation.dimensionCounts[i];
            dimensionValues.push(rate.toFixed(2) * 100);
            dimensionLabels.push(dimensionNames[i]);
        }
    }
    
    const ctx = document.getElementById('radar-chart').getContext('2d');
    
    // 销毁已存在的图表
    if (window.radarChart) {
        window.radarChart.destroy();
    }
    
    window.radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: dimensionLabels,
            datasets: [{
                label: '阅读能力评价',
                data: dimensionValues,
                backgroundColor: 'rgba(0, 113, 227, 0.2)',
                borderColor: 'rgba(0, 113, 227, 1)',
                pointBackgroundColor: 'rgba(0, 113, 227, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(0, 113, 227, 1)'
            }]
        },
        options: {
            scale: {
                ticks: {
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: {
                            size: 14
                        }
                    }
                }
            },
            scales: {
                r: {
                    pointLabels: {
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

// 生成维度详细分析
function generateDimensionDetails(evaluation) {
    const dimensionDetailsElement = document.getElementById('dimension-details');
    dimensionDetailsElement.innerHTML = '';
    
    for (let i = 0; i < 5; i++) {
        if (evaluation.dimensionCounts[i] > 0) {
            const dimensionItem = document.createElement('div');
            dimensionItem.className = 'dimension-item';
            
            const dimensionRate = evaluation.dimensionScores[i] / evaluation.dimensionCounts[i];
            const dimensionPercent = Math.round(dimensionRate * 100);
            
            const dimensionTitle = document.createElement('h4');
            dimensionTitle.textContent = `${dimensionNames[i]}: ${dimensionPercent}%`;
            dimensionItem.appendChild(dimensionTitle);
            
            const dimensionDesc = document.createElement('p');
            dimensionDesc.textContent = dimensionDetails[i].description;
            dimensionItem.appendChild(dimensionDesc);
            
            const suggestion = document.createElement('p');
            suggestion.innerHTML = dimensionRate >= 0.7 
                ? `<strong>建议:</strong> ${dimensionDetails[i].highSuggestion}`
                : `<strong>建议:</strong> ${dimensionDetails[i].lowSuggestion}`;
            dimensionItem.appendChild(suggestion);
            
            dimensionDetailsElement.appendChild(dimensionItem);
        }
    }
}

// 生成错题列表
function generateWrongQuestionsList(evaluation) {
    const wrongQuestionsList = document.getElementById('wrong-questions-list');
    wrongQuestionsList.innerHTML = '';
    
    if (evaluation.incorrectQuestions.length === 0) {
        const message = document.createElement('p');
        message.textContent = '恭喜！你全部回答正确！';
        wrongQuestionsList.appendChild(message);
        return;
    }
    
    evaluation.incorrectQuestions.forEach(item => {
        const questionItem = document.createElement('div');
        questionItem.className = 'wrong-question-item';
        
        const questionText = document.createElement('p');
        questionText.textContent = `${item.index + 1}. ${item.question}`;
        questionItem.appendChild(questionText);
        
        // 显示所有选项
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options-list';
        
        ['A', 'B', 'C', 'D'].forEach(option => {
            if (item.options && item.options[option]) {
                const optionElement = document.createElement('p');
                optionElement.className = 'option-item';
                
                // 标记正确答案和学生错误答案
                if (option === item.correctAnswer) {
                    optionElement.classList.add('correct-option');
                } else if (option === item.studentAnswer) {
                    optionElement.classList.add('wrong-option');
                }
                
                optionElement.textContent = `${option}. ${item.options[option]}`;
                optionsContainer.appendChild(optionElement);
            }
        });
        questionItem.appendChild(optionsContainer);
        
        const answerRow = document.createElement('p');
        answerRow.innerHTML = `
            <span class="wrong-answer">你的答案: ${item.studentAnswer || '未作答'}</span> &nbsp;&nbsp;
            <span class="correct-answer">正确答案: ${item.correctAnswer}</span>
        `;
        questionItem.appendChild(answerRow);
        
        if (item.explanation) {
            const explanationText = document.createElement('div');
            explanationText.className = 'explanation';
            explanationText.textContent = `解析: ${item.explanation}`;
            questionItem.appendChild(explanationText);
        }
        
        wrongQuestionsList.appendChild(questionItem);
    });
}

// 生成改进建议
function generateSuggestions(evaluation) {
    const container = document.getElementById('suggestions');
    container.innerHTML = '';
    
    // 总体评价
    const overallSuggestion = document.createElement('p');
    overallSuggestion.innerHTML = `整体表现: ${
        evaluation.correctCount >= 90 ? '<strong>优秀!</strong> 阅读能力极好，各个维度均有很好的表现。' :
        evaluation.correctCount >= 75 ? '<strong>良好!</strong> 阅读能力良好，在大多数维度有稳定表现。' :
        evaluation.correctCount >= 60 ? '<strong>及格!</strong> 阅读能力基本掌握，但需要在一些维度加强练习。' :
        '<strong>需要提升!</strong> 阅读能力有待加强，建议多进行针对性练习。'
    }`;
    container.appendChild(overallSuggestion);
    
    // 维度建议
    const weakDimensions = [];
    const strongDimensions = [];
    
    evaluation.dimensionRates.forEach((rate, index) => {
        if (evaluation.dimensionCounts[index] > 0) {
            if (rate < 0.6) {
                weakDimensions.push(index);
            } else if (rate >= 0.8) {
                strongDimensions.push(index);
            }
        }
    });
    
    // 薄弱维度建议
    if (weakDimensions.length > 0) {
        const weakTitle = document.createElement('h4');
        weakTitle.textContent = '需要提升的维度:';
        container.appendChild(weakTitle);
        
        const weakList = document.createElement('ul');
        weakDimensions.forEach(index => {
            const item = document.createElement('li');
            item.innerHTML = `<strong>${dimensionNames[index]}</strong>: ${dimensionDetails[index].lowSuggestion}`;
            weakList.appendChild(item);
        });
        container.appendChild(weakList);
    }
    
    // 强势维度表扬
    if (strongDimensions.length > 0) {
        const strongTitle = document.createElement('h4');
        strongTitle.textContent = '表现优秀的维度:';
        container.appendChild(strongTitle);
        
        const strongList = document.createElement('ul');
        strongDimensions.forEach(index => {
            const item = document.createElement('li');
            item.innerHTML = `<strong>${dimensionNames[index]}</strong>: ${dimensionDetails[index].highSuggestion}`;
            strongList.appendChild(item);
        });
        container.appendChild(strongList);
    }
    
    // 平衡发展建议
    const balanceSuggestion = document.createElement('p');
    balanceSuggestion.textContent = '阅读能力发展建议: 阅读过程中尝试提出问题，预测内容，总结大意，联系生活实际，多角度思考文本意义。每天保持阅读习惯，循序渐进提升阅读能力。';
    container.appendChild(balanceSuggestion);
}

// 打印报告
function printReport() {
    window.print();
}

// 开始新测评
function startNewAssessment() {
    // 重置表单
    document.getElementById('grade').value = '';
    document.getElementById('book').value = '';
    document.getElementById('book').disabled = true;
    document.getElementById('student-name').value = '';
    document.getElementById('questions-container').classList.add('hidden');
    document.getElementById('answer-inputs').innerHTML = '';
    
    // 切换回答案录入页
    document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    document.querySelector('nav a[data-page="input-page"]').classList.add('active');
    document.getElementById('input-page').classList.add('active');
}

// 添加分享报告功能
function shareReport() {
    // 显示加载提示
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="loading-spinner"></div><p>正在生成分享链接，请稍候...</p>';
    document.body.appendChild(loadingOverlay);

    try {
        // 获取报告中的关键数据
        const studentName = document.getElementById('report-student-name').textContent;
        const bookInfo = document.getElementById('report-book-info').textContent;
        const reportDate = document.getElementById('report-date').textContent;
        const accuracyRate = document.getElementById('accuracy-rate').textContent;

        // 获取雷达图数据（如果存在）
        let chartData = null;
        if (window.radarChart) {
            chartData = window.radarChart.data;
        }

        // 获取误题分析和改进建议
        const wrongQuestionsContent = document.getElementById('wrong-questions-list').innerHTML;
        const suggestionsContent = document.getElementById('suggestions').innerHTML;
        
        // 获取维度分析
        const dimensionDetails = document.getElementById('dimension-details').innerHTML;
        
        // 获取进步情况分析
        const progressAnalysis = document.getElementById('progress-analysis').innerHTML;

        // 创建一个包含报告数据的对象
        const reportData = {
            studentName,
            bookInfo,
            reportDate,
            accuracyRate,
            chartData: chartData ? JSON.stringify(chartData) : null,
            dimensionDetails,
            wrongQuestionsContent,
            suggestionsContent,
            progressAnalysis,
            timestamp: Date.now()
        };

        // 使用 localStorage 临时存储这个报告数据
        // 生成一个唯一的报告ID（使用时间戳和随机数结合）
        const reportId = `report_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        
        // 存储报告数据
        localStorage.setItem(reportId, JSON.stringify(reportData));
        
        // 检查已存储的报告列表
        let storedReports = JSON.parse(localStorage.getItem('sharedReports') || '[]');
        
        // 添加新的报告到列表（保持最近20个）
        storedReports.unshift({
            id: reportId,
            studentName: studentName,
            bookInfo: bookInfo,
            date: new Date().toLocaleDateString()
        });
        
        // 限制保存的报告数量
        if (storedReports.length > 20) {
            // 删除多余的报告数据
            storedReports.slice(20).forEach(oldReport => {
                localStorage.removeItem(oldReport.id);
            });
            storedReports = storedReports.slice(0, 20);
        }
        
        // 更新报告列表
        localStorage.setItem('sharedReports', JSON.stringify(storedReports));

        // 生成分享链接（URL中带有报告ID）
        const shareUrl = `${window.location.origin}${window.location.pathname}?report=${reportId}`;
        
        // 创建分享对话框
        setTimeout(() => {
            document.body.removeChild(loadingOverlay);
            
            const shareDialog = document.createElement('div');
            shareDialog.className = 'share-dialog';
            shareDialog.innerHTML = `
                <div class="share-dialog-content">
                    <h3>分享测评报告</h3>
                    <p>您可以复制以下链接分享给学生或家长：</p>
                    <div class="share-url-container">
                        <input type="text" id="share-url-input" value="${shareUrl}" readonly>
                        <button id="copy-url-btn" class="primary-btn">复制链接</button>
                    </div>
                    <p class="share-note">分享链接有效期为30天</p>
                    <div class="share-buttons">
                        <button id="close-share-dialog" class="secondary-btn">关闭</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(shareDialog);
            
            // 添加复制功能
            document.getElementById('copy-url-btn').addEventListener('click', function() {
                const urlInput = document.getElementById('share-url-input');
                urlInput.select();
                document.execCommand('copy');
                this.textContent = '已复制!';
                setTimeout(() => {
                    this.textContent = '复制链接';
                }, 2000);
            });
            
            // 添加关闭功能
            document.getElementById('close-share-dialog').addEventListener('click', function() {
                document.body.removeChild(shareDialog);
            });
        }, 800);
        
    } catch (error) {
        console.error('生成分享链接时出错:', error);
        document.body.removeChild(loadingOverlay);
        alert('无法生成分享链接，请稍后再试');
    }
}

// 添加链接分享历史页面
function displaySharedReports() {
    const sharedPage = document.getElementById('shared-reports');
    if (!sharedPage) return;
    
    sharedPage.innerHTML = '<h2>分享记录</h2>';
    
    // 获取分享记录
    const sharedReports = JSON.parse(localStorage.getItem('sharedReports') || '[]');
    
    if (sharedReports.length === 0) {
        sharedPage.innerHTML += '<p class="no-records">暂无分享记录</p>';
        return;
    }
    
    // 创建分享记录表格
    const table = document.createElement('table');
    table.className = 'history-table';
    
    // 表头
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>分享日期</th>
            <th>学生</th>
            <th>书籍</th>
            <th>操作</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // 表格内容
    const tbody = document.createElement('tbody');
    
    sharedReports.forEach(report => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${report.date || '未知日期'}</td>
            <td>${report.studentName || '未知学生'}</td>
            <td>${report.bookInfo || '未知书籍'}</td>
            <td>
                <button class="view-shared-report-btn primary-btn" data-id="${report.id}">查看</button>
                <button class="copy-report-link-btn secondary-btn" data-id="${report.id}">复制链接</button>
                <button class="delete-shared-report-btn secondary-btn" data-id="${report.id}">删除</button>
            </td>
        </tr>
        `;
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    sharedPage.appendChild(table);
    
    // 添加事件监听
    document.querySelectorAll('.view-shared-report-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const reportId = this.getAttribute('data-id');
            window.open(`${window.location.pathname}?report=${reportId}`, '_blank');
        });
    });
    
    document.querySelectorAll('.copy-report-link-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const reportId = this.getAttribute('data-id');
            const shareUrl = `${window.location.origin}${window.location.pathname}?report=${reportId}`;
            
            // 创建临时输入框复制链接
            const tempInput = document.createElement('input');
            tempInput.value = shareUrl;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            
            // 显示复制成功
            this.textContent = '已复制!';
            setTimeout(() => {
                this.textContent = '复制链接';
            }, 2000);
        });
    });
    
    document.querySelectorAll('.delete-shared-report-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm('确定要删除这条分享记录吗？')) {
                const reportId = this.getAttribute('data-id');
                
                // 从localStorage移除报告数据
                localStorage.removeItem(reportId);
                
                // 更新分享记录列表
                let sharedReports = JSON.parse(localStorage.getItem('sharedReports') || '[]');
                sharedReports = sharedReports.filter(r => r.id !== reportId);
                localStorage.setItem('sharedReports', JSON.stringify(sharedReports));
                
                // 刷新显示
                displaySharedReports();
            }
        });
    });
}

// 检查是否有分享链接访问
function checkForSharedReport() {
    // 获取URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get('report');
    
    // 如果有报告ID参数
    if (reportId) {
        // 尝试从localStorage获取对应的报告数据
        const reportDataString = localStorage.getItem(reportId);
        
        if (reportDataString) {
            try {
                const reportData = JSON.parse(reportDataString);
                
                // 显示报告内容
                displaySharedReport(reportData);
                
                // 切换到报告页面
                document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
                document.getElementById('report-page').classList.add('active');
                document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));
                document.querySelector('nav a[data-page="report-page"]').classList.add('active');
                
                return true;
            } catch (error) {
                console.error('解析分享报告数据时出错:', error);
            }
        } else {
            alert('找不到请求的测评报告，该报告可能已过期或已被删除。');
        }
    }
    
    return false;
}

// 显示分享的报告
function displaySharedReport(reportData) {
    // 设置学生信息
    document.getElementById('report-student-name').textContent = reportData.studentName;
    document.getElementById('report-book-info').textContent = reportData.bookInfo;
    document.getElementById('report-date').textContent = reportData.reportDate;
    
    // 显示准确率
    document.getElementById('accuracy-rate').textContent = reportData.accuracyRate;
    
    // 如果有图表数据，重新创建图表
    if (reportData.chartData) {
        try {
            const chartData = JSON.parse(reportData.chartData);
            
            const ctx = document.getElementById('radar-chart').getContext('2d');
            
            // 销毁已存在的图表
            if (window.radarChart) {
                window.radarChart.destroy();
            }
            
            window.radarChart = new Chart(ctx, {
                type: 'radar',
                data: chartData
            });
        } catch (error) {
            console.error('重新创建图表时出错:', error);
        }
    }
    
    // 填充维度分析
    document.getElementById('dimension-details').innerHTML = reportData.dimensionDetails;
    
    // 填充进步情况分析
    document.getElementById('progress-analysis').innerHTML = reportData.progressAnalysis;
    
    // 填充错题分析
    document.getElementById('wrong-questions-list').innerHTML = reportData.wrongQuestionsContent;
    
    // 填充改进建议
    document.getElementById('suggestions').innerHTML = reportData.suggestionsContent;
    
    // 显示报告
    document.getElementById('report-container').classList.remove('hidden');
    
    // 添加分享标记，表明这是一个共享报告视图
    const reportContainer = document.getElementById('report-container');
    
    // 添加共享报告的水印或标记
    if (!document.querySelector('.shared-report-badge')) {
        const sharedBadge = document.createElement('div');
        sharedBadge.className = 'shared-report-badge';
        sharedBadge.textContent = '分享查看';
        reportContainer.appendChild(sharedBadge);
    }
}

// 设置书籍管理功能
function setupBookManagement() {
    const deleteSelectedBookBtn = document.getElementById('delete-selected-book-btn');
    const manageGradeSelect = document.getElementById('manage-grade');
    const manageBookSelect = document.getElementById('manage-book');
    
    // 删除所选书籍
    if (deleteSelectedBookBtn) {
        deleteSelectedBookBtn.addEventListener('click', function() {
            const grade = manageGradeSelect.value;
            const book = manageBookSelect.value;
            
            if (!grade || !book) {
                alert('请先选择年级和书籍');
                return;
            }
            
            // 确认删除
            if (confirm(`确定要删除${grade}年级的《${book}》吗？`)) {
                // 从数组中删除
                const index = booksDatabase[grade].indexOf(book);
                if (index > -1) {
                    booksDatabase[grade].splice(index, 1);
                }
                
                // 删除相关答案库
                const bookKey = `${grade}-${book}`;
                if (answersDatabase[bookKey]) {
                    delete answersDatabase[bookKey];
                }
                
                // 保存到本地存储
                localStorage.setItem('booksDatabase', JSON.stringify(booksDatabase));
                localStorage.setItem('answersDatabase', JSON.stringify(answersDatabase));
                
                // 刷新书籍下拉菜单
                populateBookSelect(grade, manageBookSelect);
                
                // 隐藏标准答案设置界面
                document.getElementById('standard-answers-container').classList.add('hidden');
                
                alert(`已成功删除${grade}年级的《${book}》`);
                
                // 更新调试信息
                debugBooksDatabase();
            }
        });
    }
}

// 删除书籍
function deleteBook(grade, bookName) {
    // 从localStorage获取现有书籍
    let books = [];
    try {
        books = JSON.parse(localStorage.getItem(`books_${grade}`) || '[]');
    } catch (e) {
        console.error('获取书籍数据失败', e);
    }
    
    // 查找书籍索引
    const bookIndex = books.indexOf(bookName);
    if (bookIndex === -1) {
        alert(`未找到${grade}年级的《${bookName}》`);
        return false;
    }
    
    // 删除书籍
    books.splice(bookIndex, 1);
    localStorage.setItem(`books_${grade}`, JSON.stringify(books));
    
    // 删除该书的标准答案
    const storageKey = `standard_answers_${grade}_${bookName}`;
    localStorage.removeItem(storageKey);
    
    // 更新内存中的数据
    if (booksDatabase[grade]) {
        const dbIndex = booksDatabase[grade].indexOf(bookName);
        if (dbIndex !== -1) {
            booksDatabase[grade].splice(dbIndex, 1);
        }
    }
    
    // 删除answersDatabase中的数据
    const dbKey = `${grade}-${bookName}`;
    if (answersDatabase[dbKey]) {
        delete answersDatabase[dbKey];
        localStorage.setItem('answersDatabase', JSON.stringify(answersDatabase));
    }
    
    alert(`已成功删除${grade}年级的《${bookName}》`);
    return true;
}

// 从本地存储加载数据
function loadLocalData() {
    // 加载答案数据库
    const storedAnswers = localStorage.getItem('answersDatabase');
    if (storedAnswers) {
        try {
            answersDatabase = JSON.parse(storedAnswers);
            console.log('从本地存储加载了答案数据库');
        } catch (e) {
            console.error('解析本地存储中的答案数据库失败:', e);
        }
    }
    
    // 加载书籍数据库
    const storedBooks = localStorage.getItem('booksDatabase');
    if (storedBooks) {
        try {
            booksDatabase = JSON.parse(storedBooks);
            console.log('从本地存储加载了书籍数据库');
            
            // 检查是否有有效数据
            let hasData = false;
            for (const grade in booksDatabase) {
                if (booksDatabase[grade] && booksDatabase[grade].length > 0) {
                    hasData = true;
                    console.log(`年级${grade}有${booksDatabase[grade].length}本书`);
                    break;
                }
            }
            
            // 如果没有有效数据，则设置默认书籍
            if (!hasData) {
                setDefaultBooks();
            }
        } catch (e) {
            console.error('解析本地存储中的书籍数据库失败:', e);
            setDefaultBooks();
        }
    } else {
        // 如果本地存储中没有书籍数据，则设置默认书籍
        setDefaultBooks();
    }
    
    // 加载历史记录
    const storedHistory = localStorage.getItem('historyRecords');
    if (storedHistory) {
        try {
            historyRecords = JSON.parse(storedHistory);
            console.log('从本地存储加载了历史记录');
        } catch (e) {
            console.error('解析本地存储中的历史记录失败:', e);
        }
    }
}

// 设置默认书籍数据
function setDefaultBooks() {
    console.log('设置默认书籍数据');
    booksDatabase = {
        "1": [
            "你为什么不开花", "小兔的帽子", "森林音乐会", "彩虹桥的故事",
            "小松鼠的秋天", "蚂蚁和西瓜", "小猫找新家", "大象的长鼻子"
        ],
        "2": [
            "星星的旅行", "小猫钓鱼", "神奇的铅笔", "大树的秘密",
            "小兔子的胡萝卜", "会说话的花", "小猪的梦想", "风铃的声音"
        ],
        "3": [
            "海底探险记", "山顶的风铃", "魔法书店", "影子朋友",
            "神秘的公园", "图书馆的夜晚", "小王子", "夏洛的网"
        ],
        "4": [
            "时间的礼物", "云朵邮递员", "奇妙图书馆", "月亮的微笑",
            "神秘的灯塔", "雾中的森林", "小公主", "秘密花园"
        ],
        "5": [
            "城市与森林", "寻找宝藏", "梦想的种子", "古老的钟表",
            "失落的地图", "鲁滨逊漂流记", "格列佛游记", "西游记"
        ],
        "6": [
            "未来的信", "发明家俱乐部", "失落的王国", "星际旅行笔记",
            "三体", "基地", "银河系漫游指南", "安德的游戏"
        ]
    };
    localStorage.setItem('booksDatabase', JSON.stringify(booksDatabase));
}

// 设置导航栏切换
function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 移除所有活动状态
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            
            // 添加新的活动状态
            this.classList.add('active');
            
            // 显示对应页面
            const targetPage = document.getElementById(this.dataset.page);
            if (targetPage) {
                targetPage.classList.add('active');
            }
            
            // 如果是历史记录页，刷新历史记录
            if (this.dataset.page === 'history-page') {
                displayHistoryRecords();
            }
            
            // 如果是分享记录页，刷新分享记录
            if (this.dataset.page === 'shared-reports') {
                displaySharedReports();
            }
        });
    });
}

// 设置书籍删除功能
function setupBookDeletion() {
    const deleteBookBtn = document.getElementById('delete-selected-book-btn');
    
    if (deleteBookBtn) {
        deleteBookBtn.addEventListener('click', function() {
            const grade = document.getElementById('manage-grade').value;
            const book = document.getElementById('manage-book').value;
            
            if (!grade || !book) {
                alert('请先选择要删除的年级和书籍！');
                return;
            }
            
            // 确认删除
            const confirmDelete = confirm(`确定要删除 ${grade}年级的《${book}》及其所有答案吗？此操作不可撤销。`);
            
            if (confirmDelete) {
                // 从书籍数据库中删除
                if (booksDatabase[grade]) {
                    const bookIndex = booksDatabase[grade].indexOf(book);
                    if (bookIndex !== -1) {
                        booksDatabase[grade].splice(bookIndex, 1);
                    }
                }
                
                // 从答案数据库中删除
                const bookKey = `${grade}-${book}`;
                if (answersDatabase[bookKey]) {
                    delete answersDatabase[bookKey];
                }
                
                // 保存到本地存储
                localStorage.setItem('booksDatabase', JSON.stringify(booksDatabase));
                localStorage.setItem('answersDatabase', JSON.stringify(answersDatabase));
                
                // 刷新下拉列表
                initGradeSelection();
                
                // 清空标准答案显示区域
                document.getElementById('standard-answer-inputs').innerHTML = '';
                document.getElementById('standard-answers-container').classList.add('hidden');
                
                alert(`已成功删除 ${grade}年级的《${book}》！`);
            }
        });
    }
}

// 设置历史记录显示
function setupHistoryRecords() {
    // 加载历史记录
    const historyContainer = document.getElementById('history-records');
    
    if (historyContainer) {
        // 显示历史记录
        displayHistoryRecords();
    }
}

// 显示历史记录
function displayHistoryRecords() {
    const historyContainer = document.getElementById('history-records');
    
    if (historyContainer) {
        historyContainer.innerHTML = '';
        
        if (historyRecords.length === 0) {
            historyContainer.innerHTML = '<p class="no-data">暂无历史记录</p>';
            return;
        }
        
        // 按时间从新到旧排序
        historyRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // 创建历史记录列表
        const historyList = document.createElement('div');
        historyList.className = 'history-list';
        
        historyRecords.forEach((record, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            // 格式化日期
            const recordDate = new Date(record.date);
            const formattedDate = `${recordDate.getFullYear()}-${(recordDate.getMonth()+1).toString().padStart(2, '0')}-${recordDate.getDate().toString().padStart(2, '0')} ${recordDate.getHours().toString().padStart(2, '0')}:${recordDate.getMinutes().toString().padStart(2, '0')}`;
            
            historyItem.innerHTML = `
                <div class="history-header">
                    <h3>${record.studentName} - ${record.grade}年级《${record.book}》</h3>
                    <span class="history-date">${formattedDate}</span>
                </div>
                <div class="history-summary">
                    <span class="history-score">准确率: ${(record.score * 100).toFixed(1)}%</span>
                    <button class="view-history-btn" data-index="${index}">查看报告</button>
                </div>
            `;
            
            historyList.appendChild(historyItem);
        });
        
        historyContainer.appendChild(historyList);
        
        // 添加查看报告按钮事件
        document.querySelectorAll('.view-history-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                const record = historyRecords[index];
                
                // 加载报告
                loadReportFromHistory(record);
                
                // 切换到报告页面
                document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));
                document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
                
                document.querySelector('nav a[data-page="report-page"]').classList.add('active');
                document.getElementById('report-page').classList.add('active');
            });
        });
    }
}

// 设置分享功能
function setupSharingFeature() {
    // 创建分享按钮
    const shareReportBtn = document.createElement('button');
    shareReportBtn.id = 'share-report';
    shareReportBtn.className = 'primary-btn';
    shareReportBtn.textContent = '分享报告';
    
    // 将分享按钮添加到报告页面的按钮组
    const reportButtons = document.querySelector('#report-page .buttons');
    if (reportButtons) {
        reportButtons.appendChild(shareReportBtn);
    }
    
    // 添加分享按钮点击事件
    if (shareReportBtn) {
        shareReportBtn.addEventListener('click', shareReport);
    }
    
    // 显示分享记录
    displaySharedReports();
}

// 设置打印功能
function setupPrintFeature() {
    const printBtn = document.getElementById('print-report');
    const newAssessmentBtn = document.getElementById('new-assessment');
    
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            window.print();
        });
    }
    
    if (newAssessmentBtn) {
        newAssessmentBtn.addEventListener('click', function() {
            // 跳转到答案录入页面
            document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));
            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            
            document.querySelector('nav a[data-page="input-page"]').classList.add('active');
            document.getElementById('input-page').classList.add('active');
            
            // 清空学生姓名输入
            document.getElementById('student-name').value = '';
            
            // 重置答案选择区域
            document.getElementById('questions-container').classList.add('hidden');
            document.getElementById('answer-inputs').innerHTML = '';
        });
    }
}

// 设置书籍展示功能
function setupBooksGallery() {
    console.log('设置书籍展示功能');
    
    // 获取相关DOM元素
    const booksGallery = document.getElementById('imported-books-gallery');
    const filterButtons = document.querySelectorAll('.books-filter .filter-btn');
    
    if (!booksGallery) return;
    
    // 初始化展示所有书籍
    displayBooksGallery('all');
    
    // 设置筛选按钮事件
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除所有按钮的active类
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // 给当前点击的按钮添加active类
            this.classList.add('active');
            
            // 获取年级
            const grade = this.getAttribute('data-grade');
            
            // 显示对应年级的书籍
            displayBooksGallery(grade);
        });
    });
}

// 显示书籍展示区
function displayBooksGallery(gradeFilter) {
    console.log('显示书籍展示区，筛选年级:', gradeFilter);
    
    const booksGallery = document.getElementById('imported-books-gallery');
    
    if (!booksGallery) return;
    
    // 清空当前内容
    booksGallery.innerHTML = '';
    
    // 统计所有书籍总数
    let totalBooks = 0;
    Object.keys(booksDatabase).forEach(grade => {
        if (booksDatabase[grade]) {
            totalBooks += booksDatabase[grade].length;
        }
    });
    
    // 如果没有书籍，显示提示
    if (totalBooks === 0) {
        booksGallery.innerHTML = '<div class="no-books-message">暂无已导入的书籍，请先导入Excel文件</div>';
        return;
    }
    
    // 生成书籍卡片
    let booksCount = 0;
    
    Object.keys(booksDatabase).forEach(grade => {
        // 跳过非数字的键（如果有）
        if (isNaN(parseInt(grade))) return;
        
        // 如果设置了筛选且不是"all"，则只显示对应年级
        if (gradeFilter !== 'all' && grade !== gradeFilter) return;
        
        // 获取当前年级的书籍
        const books = booksDatabase[grade] || [];
        
        // 为每本书创建卡片
        books.forEach(book => {
            booksCount++;
            
            // 创建书籍卡片
            const bookItem = document.createElement('div');
            bookItem.className = 'book-item';
            bookItem.setAttribute('data-grade', grade);
            bookItem.setAttribute('data-book', book);
            
            // 使用书籍标题首字母作为封面
            const firstChar = book.charAt(0);
            
            // 构建卡片内容
            bookItem.innerHTML = `
                <div class="book-grade">${grade}年级</div>
                <div class="book-cover">${firstChar}</div>
                <div class="book-title">${book}</div>
            `;
            
            // 添加点击事件
            bookItem.addEventListener('click', function() {
                const clickedGrade = this.getAttribute('data-grade');
                const clickedBook = this.getAttribute('data-book');
                
                // 设置年级和书籍下拉框
                const gradeSelect = document.getElementById('grade');
                const bookSelect = document.getElementById('book');
                
                if (gradeSelect && bookSelect) {
                    // 设置年级
                    gradeSelect.value = clickedGrade;
                    
                    // 触发年级change事件以更新书籍下拉框
                    const event = new Event('change');
                    gradeSelect.dispatchEvent(event);
                    
                    // 等待书籍下拉框更新
                    setTimeout(() => {
                        // 设置书籍
                        bookSelect.value = clickedBook;
                        
                        // 触发书籍change事件
                        bookSelect.dispatchEvent(new Event('change'));
                    }, 100);
                }
            });
            
            // 添加到展示区
            booksGallery.appendChild(bookItem);
        });
    });
    
    // 如果筛选后没有书籍，显示提示
    if (booksCount === 0) {
        if (gradeFilter === 'all') {
            booksGallery.innerHTML = '<div class="no-books-message">暂无已导入的书籍，请先导入Excel文件</div>';
        } else {
            booksGallery.innerHTML = `<div class="no-books-message">${gradeFilter}年级暂无已导入的书籍</div>`;
        }
    }
}

// 添加自定义调试函数
// ... existing code ...