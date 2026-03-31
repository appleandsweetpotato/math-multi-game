// script.js - 乘法农场游戏核心逻辑
(function(){
    // ---------- 游戏配置 ----------
    const GRID_SIZE = 6;        // 6x6 网格
    let currentGrid = [];       // 二维数组存储每个格子是否有方块 true/false
    let currentWidth = 0;       // 实际组成长方形的宽（列数）
    let currentHeight = 0;      // 高（行数）
    let currentArea = 0;
    
    // 当前题目
    let currentQuestion = { multiplicand: 3, multiplier: 4, product: 12 };
    
    // DOM 元素
    const gridBoard = document.getElementById('gridBoard');
    const blocksContainer = document.getElementById('blocksContainer');
    const questionTextSpan = document.getElementById('questionText');
    const answerInput = document.getElementById('answerInput');
    const checkBtn = document.getElementById('checkBtn');
    const newGameBtn = document.getElementById('newGameBtn');
    const clearBoardBtn = document.getElementById('clearBoardBtn');
    const feedbackMsgDiv = document.getElementById('feedbackMsg');
    const widthDisplaySpan = document.getElementById('widthDisplay');
    const heightDisplaySpan = document.getElementById('heightDisplay');
    const areaDisplaySpan = document.getElementById('areaDisplay');
    
    // ---------- 辅助函数 ----------
    // 初始化网格 (全部为false)
    function initGrid() {
        currentGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
    }
    
    // 渲染网格视图 (根据 currentGrid)
    function renderGrid() {
        if (!gridBoard) return;
        gridBoard.innerHTML = '';
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                if (currentGrid[row][col]) {
                    cell.classList.add('filled');
                    cell.textContent = '🌿';   // 小装饰
                } else {
                    cell.textContent = '';
                }
                // 添加放置事件监听 (点击空白区域放置方块，方便触屏)
                if (!currentGrid[row][col]) {
                    cell.addEventListener('click', (function(r,c) {
                        return function() { placeBlockAt(r,c); };
                    })(row, col));
                    
                    // 增加dragover/drop 支持拖拽放置
                    cell.addEventListener('dragover', (e) => {
                        e.preventDefault();
                    });
                    cell.addEventListener('drop', (e) => {
                        e.preventDefault();
                        const targetRow = row;
                        const targetCol = col;
                        if (!currentGrid[targetRow][targetCol]) {
                            placeBlockAt(targetRow, targetCol);
                        }
                    });
                } else {
                    // 已填充的格子不需要放置事件，但可以增加移除效果？为了体验，不做删除以免混淆，但清空按钮可用。
                }
                gridBoard.appendChild(cell);
            }
        }
        updateDimensionAndArea();
    }
    
    // 放置方块到指定格子
    function placeBlockAt(row, col) {
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;
        if (currentGrid[row][col]) return; // 已有方块
    
        currentGrid[row][col] = true;
        renderGrid();   // 重绘网格
        // 拖拽后判断长方形并更新自动批改?
        // 自动更新题目批改状态（只要面积变化，重新检查一次答案显示提示）
        autoCheckAnswerByArea();
    }
    
    // 计算当前放置区域的最大矩形（连续方块组成的长方形）
    // 要求：从(0,0)开始找到最大连续矩形？但游戏场景最好是任意摆放的完整矩形，但小朋友可能摆成L型。
    // 为了让游戏更友好，我们识别当前所有填充方块是否能组成一个完整的长方形（即填充区域外无空洞且区域是矩形）。
    // 算法：找到所有填充方块的最小行、最大行、最小列、最大列，然后检查区域内是否全部填充且区域外没有填充。
    function getCurrentRectangleInfo() {
        let minRow = GRID_SIZE, maxRow = -1, minCol = GRID_SIZE, maxCol = -1;
        let filledCount = 0;
        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                if (currentGrid[i][j]) {
                    filledCount++;
                    minRow = Math.min(minRow, i);
                    maxRow = Math.max(maxRow, i);
                    minCol = Math.min(minCol, j);
                    maxCol = Math.max(maxCol, j);
                }
            }
        }
        if (filledCount === 0) {
            return { width: 0, height: 0, area: 0, isValidRectangle: false };
        }
        const rectHeight = maxRow - minRow + 1;
        const rectWidth = maxCol - minCol + 1;
        const expectedArea = rectHeight * rectWidth;
        // 检查区域内是否每个格子都填满了
        let allFilledInRect = true;
        for (let i = minRow; i <= maxRow; i++) {
            for (let j = minCol; j <= maxCol; j++) {
                if (!currentGrid[i][j]) {
                    allFilledInRect = false;
                    break;
                }
            }
        }
        // 并且区域外没有多余方块 (因为当前filledCount只包含内部的，自动保证区域外无填充)
        const isValid = (filledCount === expectedArea) && allFilledInRect;
        return {
            width: rectWidth,
            height: rectHeight,
            area: filledCount,
            isValidRectangle: isValid,
            minRow, maxRow, minCol, maxCol
        };
    }
    
    // 更新界面显示长方形尺寸和面积，并判断是否符合题目，更新反馈
    function updateDimensionAndArea() {
        const rectInfo = getCurrentRectangleInfo();
        if (rectInfo.isValidRectangle && rectInfo.area > 0) {
            currentWidth = rectInfo.width;
            currentHeight = rectInfo.height;
            currentArea = rectInfo.area;
            widthDisplaySpan.textContent = currentHeight;    // 高度（行）展示为高
            heightDisplaySpan.textContent = currentWidth;    // 宽度（列）
            areaDisplaySpan.textContent = currentArea;
        } else {
            // 不是有效长方形则显示0，但展示当前松散方块数量
            let fillCount = 0;
            for(let i=0;i<GRID_SIZE;i++) for(let j=0;j<GRID_SIZE;j++) if(currentGrid[i][j]) fillCount++;
            currentWidth = 0;
            currentHeight = 0;
            currentArea = 0;
            widthDisplaySpan.textContent = '?';
            heightDisplaySpan.textContent = '?';
            areaDisplaySpan.textContent = fillCount;
            // 如果非长方形且有方块，提示一下
            if(fillCount>0 && !rectInfo.isValidRectangle){
                // 可以在反馈区域提示但不清除主要反馈
                if(!feedbackMsgDiv.innerHTML.includes("不是长方形")){
                    // 但不要覆盖正确批改消息，放在临时？
                    // 我们仅在未提交正确答案时提示友好消息
                }
            }
        }
    }
    
    // 自动批改：根据当前有效长方形面积与题目乘积是否匹配
    function autoCheckAnswerByArea() {
        const rectInfo = getCurrentRectangleInfo();
        if (!rectInfo.isValidRectangle || rectInfo.area === 0) {
            // 不是有效长方形，清除正确标记但不清空反馈文案，保留一个提示
            if(feedbackMsgDiv.classList.contains('correct')) {
                feedbackMsgDiv.classList.remove('correct');
                feedbackMsgDiv.classList.remove('wrong');
            }
            if (rectInfo.area > 0 && !rectInfo.isValidRectangle) {
                feedbackMsgDiv.innerHTML = '🧩 要拼成一个完整的长方形哟！没有缺口～';
                feedbackMsgDiv.classList.add('wrong');
            } else if(rectInfo.area === 0){
                feedbackMsgDiv.innerHTML = '✨ 拖动左边的小方块到右侧农场，拼出长方形吧！';
                feedbackMsgDiv.classList.remove('correct','wrong');
            }
            return;
        }
        
        const product = currentQuestion.product;
        const isCorrect = (rectInfo.area === product);
        if (isCorrect) {
            feedbackMsgDiv.innerHTML = '🎉 完全正确！ 长方形面积 = ' + rectInfo.area + '， 答对啦！ 🌟🌟🌟';
            feedbackMsgDiv.classList.add('correct');
            feedbackMsgDiv.classList.remove('wrong');
            // 顺便自动把答案框预填数字? 给小朋友鼓励
            answerInput.value = rectInfo.area;
        } else {
            feedbackMsgDiv.innerHTML = `🤔 当前长方形面积 = ${rectInfo.area}，题目要求 ${currentQuestion.multiplicand} × ${currentQuestion.multiplier} = ${product}，再试试看！`;
            feedbackMsgDiv.classList.add('wrong');
            feedbackMsgDiv.classList.remove('correct');
        }
    }
    
    // 主动检查按钮 (从输入框取值比对)
    function manualCheck() {
        let userAnswer = parseInt(answerInput.value.trim(), 10);
        if (isNaN(userAnswer)) {
            feedbackMsgDiv.innerHTML = '🔢 在框里输入数字答案吧！';
            feedbackMsgDiv.classList.add('wrong');
            feedbackMsgDiv.classList.remove('correct');
            return;
        }
        const correctProduct = currentQuestion.product;
        if (userAnswer === correctProduct) {
            feedbackMsgDiv.innerHTML = `🎈 正确！ ${currentQuestion.multiplicand} × ${currentQuestion.multiplier} = ${correctProduct} ！ 太棒了！`;
            feedbackMsgDiv.classList.add('correct');
            feedbackMsgDiv.classList.remove('wrong');
            // 同时如果农场面积也对，额外奖励; 否则提示也拼出正确面积
            const rectInfo = getCurrentRectangleInfo();
            if(rectInfo.isValidRectangle && rectInfo.area === correctProduct){
                feedbackMsgDiv.innerHTML += ' 而且你的农场刚刚好！ 🌟🌟🌟';
            } else {
                feedbackMsgDiv.innerHTML += ' 试试用方块拼出同样面积的长方形吧！';
            }
        } else {
            feedbackMsgDiv.innerHTML = `❌ 不对哦， ${currentQuestion.multiplicand} × ${currentQuestion.multiplier} 不等于 ${userAnswer}，再想一想～`;
            feedbackMsgDiv.classList.add('wrong');
            feedbackMsgDiv.classList.remove('correct');
        }
    }
    
    // 生成新题目 (乘法表范围 1~6，面积不超过36)
    function generateNewQuestion() {
        let a = Math.floor(Math.random() * 6) + 1; // 1-6
        let b = Math.floor(Math.random() * 6) + 1;
        // 确保不超6x6但也没关系，最大面积36刚好符合网格
        currentQuestion = {
            multiplicand: a,
            multiplier: b,
            product: a * b
        };
        questionTextSpan.textContent = `${currentQuestion.multiplicand} × ${currentQuestion.multiplier} = ?`;
        answerInput.value = '';
        // 重置反馈为中性
        feedbackMsgDiv.innerHTML = '🌱 新题目！拖拽方块拼出长方形，面积要等于答案哦～';
        feedbackMsgDiv.classList.remove('correct','wrong');
        // 清空当前农场面板
        clearAllBlocks();
    }
    
    // 清空所有方块
    function clearAllBlocks() {
        initGrid();
        renderGrid();
        updateDimensionAndArea();
        const rectInfo = getCurrentRectangleInfo();
        if(rectInfo.area === 0) {
            feedbackMsgDiv.innerHTML = '🧹 农场已清空，快拖拽新方块开始吧！';
            feedbackMsgDiv.classList.remove('correct','wrong');
        }
        answerInput.value = '';
    }
    
    // ---------- 拖拽方块库生成 ----------
    function generateDraggableBlocks() {
        if(!blocksContainer) return;
        blocksContainer.innerHTML = '';
        // 提供24个可拖拽方块，小朋友随便拖拽，足够玩
        for(let i=0; i<30; i++) {
            const block = document.createElement('div');
            block.classList.add('drag-block');
            block.setAttribute('draggable', 'true');
            block.textContent = '🍎';
            block.setAttribute('aria-label', '可拖拽方块');
            
            // drag 数据传输
            block.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', 'block');
                e.dataTransfer.effectAllowed = 'copy';
            });
            // 触摸屏需要用 touch 事件模拟拖拽(为了移动端完美体验)
            // 移动端: 我们使用 touchmove + touchstart 模拟
            // 为了让手机也能拖拽，添加简单的touch模拟(简易移动)
            let startTouch = null;
            block.addEventListener('touchstart', (e) => {
                e.preventDefault();
                startTouch = e.touches[0];
                const touchBlock = e.target.closest('.drag-block');
                if(touchBlock) touchBlock.style.opacity = '0.5';
            });
            block.addEventListener('touchmove', (e) => {
                if(!startTouch) return;
                e.preventDefault();
                const touch = e.touches[0];
                // 获取网格中的元素，通过document.elementFromPoint获取
                const elemUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetCell = elemUnderTouch?.closest('.grid-cell');
                if(targetCell && !targetCell.classList.contains('filled')) {
                    // 高亮一下
                    targetCell.style.backgroundColor = '#ffd966';
                    setTimeout(()=>{
                        if(targetCell) targetCell.style.backgroundColor = '';
                    },150);
                }
            });
            block.addEventListener('touchend', (e) => {
                e.preventDefault();
                const changed = e.changedTouches[0];
                const elemAtEnd = document.elementFromPoint(changed.clientX, changed.clientY);
                const targetCell = elemAtEnd?.closest('.grid-cell');
                if(targetCell && !targetCell.classList.contains('filled')) {
                    // 获取行列
                    const allCells = Array.from(gridBoard.children);
                    const idx = allCells.indexOf(targetCell);
                    if(idx !== -1) {
                        const row = Math.floor(idx / GRID_SIZE);
                        const col = idx % GRID_SIZE;
                        placeBlockAt(row, col);
                    }
                }
                if(block) block.style.opacity = '';
                startTouch = null;
            });
            blocksContainer.appendChild(block);
        }
    }
    
    // 重置并初始化游戏
    function initGame() {
        initGrid();
        generateDraggableBlocks();
        generateNewQuestion();  // 随机题目并清空面板
        renderGrid();
        updateDimensionAndArea();
    }
    
    // 绑定事件监听
    function bindEvents() {
        checkBtn.addEventListener('click', manualCheck);
        newGameBtn.addEventListener('click', () => {
            generateNewQuestion();
        });
        clearBoardBtn.addEventListener('click', () => {
            clearAllBlocks();
        });
        // 防止整个页面拖拽图片默认行为
        window.addEventListener('dragstart', (e) => {
            if(!e.target.closest('.drag-block')) e.preventDefault();
        });
    }
    
    // 启动
    initGame();
    bindEvents();
    // 额外：当输入框回车快速检查
    answerInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') manualCheck();
    });
})();