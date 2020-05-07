// SUDOKU Generation and Solving
// -- Andy Camann

// research paper on generating: https://sites.math.washington.edu/~morrow/mcm/team2280.pdf
// guides to solving: https://www.sudokudragon.com/sudokututorials.htm
// difficulty scoring and rule costs: https://www.sudokuoftheday.com/about/difficulty/ - forum post where it was first proposed: https://web.archive.org/web/20060712220000/http://www.setbb.com/phpbb/viewtopic.php?t=142&mforum=sudoku

// a band is a set of three blocks that are horizontally contiguous
// a stack is the vertical equivalent.


//#region Global Constants & Variables

var difficulty = 0;
const BLOCK_SIZE = 3;
var solution = [
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0]
];
var puzzle = [
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0]
];
var solvingProcess = [
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0]
];

//#endregion

//#region Generate Puzzle using Latin Squares (OLD) 

function generateRandomSolutionUsingLatinSquares() {
    const latinSquares = [
        [[0,1,2],[1,2,0],[2,0,1]],
        [[0,1,2],[2,0,1],[1,2,0]],
        [[0,2,1],[1,0,2],[2,1,0]],
        [[0,2,1],[2,1,0],[1,0,2]],
        [[1,0,2],[0,2,1],[2,1,0]],
        [[1,0,2],[2,1,0],[0,2,1]],
        [[1,2,0],[0,1,2],[2,0,1]],
        [[1,2,0],[2,0,1],[0,1,2]],
        [[2,1,0],[0,2,1],[1,0,2]],
        [[2,1,0],[1,0,2],[0,2,1]],
        [[2,0,1],[0,1,2],[1,2,0]],
        [[2,0,1],[1,2,0],[0,1,2]]
    ];

    // select a 3x3 Latin Square & treat it as the first digit of a two-digit base 3 number corresponding with each block
    const conversionBlock = latinSquares[Math.floor(Math.random() * 12)].map(row => row.map(x => x * 3));
    
    // select nine 3x3 Latin Squares, with replacement
    let blocks = [];
    for (let blockNumber = 0; blockNumber < 9; blockNumber++) {
        //convert to base 10 using the value from conversionBlock that corresponds to this block
        blocks.push(latinSquares[Math.floor(Math.random() * 12)].map(row => row.map(x => x + conversionBlock[Math.floor(blockNumber / 3)][blockNumber % 3] + 1)));
    }
    
    // convert blocks to rows
    solution = getRowArrayFromBlockArray(blocks);

    // swap rows to remove block duplicates (2nd & 4th, 3rd & 7th, 6th & 8th?)
    swapRows(solution, 1, 3);
    swapRows(solution, 2, 6);
    swapRows(solution, 5, 7);

    applyRandomTransformations(solution);
}

//#endregion 

//#region Init and Manipulate DOM

async function init() {    
    createGridInDOM('puzzle');
    createGridInDOM('solving-process');
    createGridInDOM('solution');

    generatePuzzle();
    solvingProcess = puzzle.map(row => row.slice());

    placeSudokuOnGrid('puzzle', puzzle);
    placeSudokuOnGrid('solving-process', solvingProcess);
    placeSudokuOnGrid('solution', solution);

    console.time('Solve Puzzle Using Human Approaches');
    solvePuzzleUsingHumanSteps(solvingProcess);
    console.timeEnd('Solve Puzzle Using Human Approaches');
}

function highlightCell(domID, row, col, value) {
    const grid = document.querySelector(`#${domID}`);
    var cell = grid.querySelectorAll(`.row-${row}.col-${col}`)[0];
    cell.setAttribute('class', `row-${row} col-${col} highlight`);
    cell.innerText = value;
}

function createGridInDOM(domID) {
    const grid = document.querySelector(`#${domID}`);
    for (let row = 0; row < solution.length; row++) {
        for (let col = 0; col < solution[row].length; col++) {
            var cell = document.createElement('div');
            cell.setAttribute('class', `row-${row} col-${col} empty`);
            grid.appendChild(cell);
        }
    }
}
function placeSudokuOnGrid(domID, rowArray) {
    const grid = document.querySelector(`#${domID}`);
    for (let row = 0; row < rowArray.length; row++) {
        for (let col = 0; col < rowArray[row].length; col++) {
            var cell = grid.querySelectorAll(`.row-${row}.col-${col}`)[0];
            
            if (rowArray[row][col] === 0) {
                cell.setAttribute('class', `row-${row} col-${col} empty`);
            } else {
                cell.setAttribute('class', `row-${row} col-${col}`);
                cell.innerText = rowArray[row][col];
            }
        }
    }
}

// #endregion

//#region Generate New Puzzle

function generatePuzzle() {
    const INITIAL_CELLS_TO_ERASE = 40;
    const FINAL_CELLS_TO_ERASE = 55;
    
    console.time('Generate Random Puzzle Solution');
    solvePuzzleUsingBacktracking(solution, getIndicesOfEmptyCells(solution)); // generate random puzzle solution state from empty grid
    console.timeEnd('Generate Random Puzzle Solution');
    
    // apply random transformations to puzzle
    applyRandomTransformations(solution);
    
    let solutions = 0;    
    console.time('Find Puzzle with Unique Solution and sufficient complexity');
    while (solutions != 1) {
        puzzle = solution.map(row => row.slice());
        erasedCells = [];
    
        // remove values at random
        for (let i = 0; i < INITIAL_CELLS_TO_ERASE;) {
            let erasedCell = eraseRandomCell(puzzle);
            if (erasedCell) {
                erasedCells.push(erasedCell);
                i++;
            }
        }        
        let puzzleToCheck = puzzle.map(row => row.slice());
        solutions = checkForUniqueSolutions(puzzleToCheck, getIndicesOfEmptyCells(puzzleToCheck));
    }

    let attemptedCells = erasedCells.map(cell => cell.slice());
    while (erasedCells.length < FINAL_CELLS_TO_ERASE) { // TODO: make this check for difficulty instead of number of removed cells
        let erasedCell = eraseRandomCell(puzzle);
        //console.log(`${erasedCell} and list = ${erasedCells.toString()}`);
        if (erasedCell) {
            attemptedCells.push(erasedCell);
            erasedCells.push(erasedCell);             
            let puzzleToCheck = puzzle.map(row => row.slice());
            solutions = checkForUniqueSolutions(puzzleToCheck, getIndicesOfEmptyCells(puzzleToCheck));
            if (solutions > 1) {
                let row = erasedCell[0];
                let col = erasedCell[1];
                puzzle[row][col] = solution[row][col];
                erasedCells.pop();
            }
        }
        if (attemptedCells.length > 80) {
            console.log(`${attemptedCells.length}: ${attemptedCells.toString()}`);
            console.log('Attempted all givens!'); 
            break;  
        }
        //console.log(`${solutions} solutions for ${puzzle.toString()}`);
    }

    console.timeEnd('Find Puzzle with Unique Solution and sufficient complexity');
}

function eraseRandomCell(rowArray) {
    let row = Math.floor(Math.random() * 9);
    let col = Math.floor(Math.random() * 9);
    //let value = rowArray[row][col];
    if (rowArray[row][col] == 0) return false;
    rowArray[row][col] = 0;
    return [row, col];
}

//#endregion

//#region Transformations 

function applyRandomTransformations(rowArray, maxTransformations = 100) {
    console.time('Apply Transformations');    
    //transform the solution using a random amount and combination permuations:
    let randomNumberOfTransformations = Math.random() * maxTransformations;    
    for (let i = 0; i < randomNumberOfTransformations; i++) {
        let permutation = Math.floor(Math.random() * 4);
        switch (permutation) {
            case 0: 
                randomRowPermutation(rowArray);             // 1. Row permutations within band
                break;
            case 1:
                randomColumnPermutation(rowArray);          // 2. Column permutations within stack
                break;
            case 2:
                randomSymbolPermutation(rowArray);    // 3. Symbol permutation
                break;
            case 3:
                transposeGrid(rowArray);            // 4. Transpose
                break;
        }             
    }
    console.timeEnd('Apply Transformations');    
}

function randomRowPermutation(rowArray) {
    let bandBase = Math.floor(Math.random() * 3) * 3;
    swapRows(rowArray, Math.floor(Math.random() * 3) + bandBase, Math.floor(Math.random() * 3) + bandBase); 
}

function randomColumnPermutation(rowArray) {
    let bandBase = Math.floor(Math.random() * 3) * 3;
    swapColumns(rowArray, Math.floor(Math.random() * 3) + bandBase, Math.floor(Math.random() * 3) + bandBase); 
}

function randomSymbolPermutation(rowArray) {
    swapSymbols(rowArray, Math.floor(Math.random() * 9) + 1, Math.floor(Math.random() * 9) + 1);
}

function transposeGrid(rowArray) {
    let transposed = [];
    for (let row = 0; row < 9; row++) {
        let transposedRow = [];
        for (let col = 0; col < 9; col++) {
            transposedRow.push(rowArray[col][row]);
        }
        transposed.push(transposedRow);
    }
    rowArray = transposed;
}

function swapRows(rowArray, row, rowToSwap) {
    if (row == rowToSwap) return;
    let tempRow = rowArray[row];
    rowArray[row] = rowArray[rowToSwap];
    rowArray[rowToSwap] = tempRow;
}

function swapColumns(rowArray, column, columnToSwap) {
    if (column == columnToSwap) return;
    for (let rowIndex = 0; rowIndex < rowArray.length; rowIndex++) {
        let tempVal = rowArray[rowIndex][column];
        rowArray[rowIndex][column] = rowArray[rowIndex][columnToSwap];
        rowArray[rowIndex][columnToSwap] = tempVal;
    }
}

function swapSymbols(rowArray, symbol, symbolToSwap) {
    if (symbol == symbolToSwap) return;
    for (let row = 0; row < rowArray.length; row++) {
        for (let col = 0; col < rowArray[row].length; col++) {
            let cellValue = rowArray[row][col];
            if (cellValue == symbol) {
                rowArray[row][col] = symbolToSwap;
            } else if (cellValue == symbolToSwap) {
                rowArray[row][col] = symbol;
            }
        }
    }
}

// #endregion Transformations //

//#region Solving Algorithms

function solvePuzzleUsingBacktracking(sudoku, emptyCells) {
    if (emptyCells.length === 0) return true;
    var row = emptyCells[0][0];
    var col = emptyCells[0][1];

    var valuesToCheck = shuffle([1,2,3,4,5,6,7,8,9]);

    for (let i = 0; i < valuesToCheck.length; i++) {
        //console.log(`(${row},${col}) valuesToCheck is ${valuesToCheck.toString()}, checking index ${i}: ${valuesToCheck[i]}... ${this.checkValue(sudoku, row, col, valuesToCheck[i])}, emptyCells.length = ${emptyCells.length}, solutionCount = ${solutionCount}`);
        if (this.checkValue(sudoku, row, col, valuesToCheck[i])) {
            sudoku[row][col] = valuesToCheck[i];
            emptyCells.shift();
            if (solvePuzzleUsingBacktracking(sudoku, emptyCells)) {
                return true;
            }
            sudoku[row][col] = 0
            emptyCells.unshift([row,col]);
        }
    }
    return false;
}


/// solving algorithm, returns 0 = no solutions, 1 = one unique solution, 2 = more than one possible solution
function checkForUniqueSolutions(sudoku, emptyCells, solutionCount = 0) {
    if (emptyCells.length === 0) return solutionCount + 1;
    var row = emptyCells[0][0];
    var col = emptyCells[0][1];

    var valuesToCheck = shuffle([1,2,3,4,5,6,7,8,9]);

    for (let i = 0; i < valuesToCheck.length; i++) {
        //console.log(`(${row},${col}) valuesToCheck is ${valuesToCheck.toString()}, checking index ${i}: ${valuesToCheck[i]}... ${this.checkValue(sudoku, row, col, valuesToCheck[i])}, emptyCells.length = ${emptyCells.length}, solutionCount = ${solutionCount}`);
        if (this.checkValue(sudoku, row, col, valuesToCheck[i])) {
            sudoku[row][col] = valuesToCheck[i];
            emptyCells.shift();
            solutionCount = checkForUniqueSolutions(sudoku, emptyCells, solutionCount);
            if (solutionCount < 2) {
                sudoku[row][col] = 0
                emptyCells.unshift([row,col]);
            }
        }
    }
    return solutionCount;
}

function getIndicesOfEmptyCells(sudoku) {
    let emptyPositions = [];
    for (let row = 0; row < sudoku.length; row++) {
        for (let col = 0; col < sudoku[row].length; col++) {
            if (sudoku[row][col] === 0) {
                emptyPositions.push([row, col]);
            }
        }
    }
    return emptyPositions;
}


function checkRow(sudoku, row, value) {
    for (let col = 0; col < sudoku[row].length; col++) {
        if(sudoku[row][col] === value) {
            return false
        }
    }
    return true;
}

function checkColumn(sudoku, col, value) {
    for (let row = 0; row < sudoku.length; row++) {
        if(sudoku[row][col] === value) {
            return false
        }
    }
    return true;
}

function checkBlock(sudoku, row, col, value) {
    let firstRowOfBlock = Math.floor(row / BLOCK_SIZE) * BLOCK_SIZE;
    let firstColOfBlock = Math.floor(col / BLOCK_SIZE) * BLOCK_SIZE;
    for (let rowToCheck = firstRowOfBlock; rowToCheck < firstRowOfBlock + BLOCK_SIZE; rowToCheck++) {
        for (let colToCheck = firstColOfBlock; colToCheck < firstColOfBlock + BLOCK_SIZE; colToCheck++) {
            if (sudoku[rowToCheck][colToCheck] === value) {
                return false;
            }
        }
    }
    return true;
}

function checkValue(sudoku, row, col, value) {
    return checkRow(sudoku, row, value) && checkColumn(sudoku, col, value) && checkBlock(sudoku, row, col, value);
}

//#endregion

//#region Human Solving Approaches

// TODO: make an array of all remaining possibilities in each cell as a set of possible values
function solvePuzzleUsingHumanSteps(sudoku) {
    let emptyCells = getIndicesOfEmptyCells(sudoku);
    while (humanSolutionStep = findHumanSolutionStep(sudoku, emptyCells)) {
        let row = humanSolutionStep[0];
        let col = humanSolutionStep[1];
        let value = humanSolutionStep[2];
        let explanation = humanSolutionStep[3];
        highlightCell('solving-process', row, col, value);   //TODO: this is too coupled to the view
        document.querySelector('#sudoku-string').innerHTML += `${explanation}<br />`;
        sudoku[row][col] = value;
        emptyCells = emptyCells.filter(cell => !(cell[0]==row && cell[1]==col));
    } 
    document.querySelector('#sudoku-string').innerHTML += 'No more squares can be solved using available human rules.<br />';
    if (emptyCells.length == 0) {
        document.querySelector('#sudoku-string').innerHTML += `Puzzle Solved!  Difficulty Rating: ${difficulty}`;
    }
}

function findHumanSolutionStep(sudoku, emptyCells) {
    let humanSolutionStep = false;
    if (humanSolutionStep = findOnlyChoiceRule(sudoku)) {
        difficulty += 100;
    } else if (humanSolutionStep = findSinglePossibilityRule(sudoku, emptyCells)) {
        difficulty += 200;
    }
    return humanSolutionStep;
}

// 1: ONLY CHOICE RULE (Single Candidate, cost: 100, 100)

// returns [row, col, value, explanation] or false if the Only Choice Rule cannot be applied anywhere
function findOnlyChoiceRule(sudoku) {
    for (let row = 0; row < 9; row++) {
        if (col = checkRowForOnlyChoiceRule(sudoku, row)) {
            for (let value = 1; value < 10; value++) {
                if (checkRow(sudoku, row, value)) {
                    return [row, col, value, `According to the Only Choice Rule, the value in (${row+1}, ${col+1}) must be ${value} because the row already contains all other possible values.`]
                }
            }
        }
    }
    for (let col = 0; col < 9; col++) {
        if (row = checkColumnForOnlyChoiceRule(sudoku, col)) {
            for (let value = 1; value < 10; value++) {
                if (checkColumn(sudoku, col, value)) {
                    return [row, col, value, `According to the Only Choice Rule, the value in (${row+1}, ${col+1}) must be ${value} because the column already contains all other possible values.`]
                }
            }
        }
    }
    for (let topRowOfBlock = 0; topRowOfBlock < 8; topRowOfBlock += 3) {
        for (let leftColOfBlock = 0; leftColOfBlock < 8; leftColOfBlock += 3) {
            if (cell = checkBlockForOnlyChoiceRule(sudoku, [topRowOfBlock, leftColOfBlock])) {
                let row = cell[0];
                let col = cell[1];
                for (let value = 1; value < 10; value++) {
                    if (checkBlock(sudoku, row, col, value)) {
                        return [row, col, value, `According to the Only Choice Rule, the value in (${row+1}, ${col+1}) must be ${value} because the block already contains all other possible values.`]
                    }
                }
            }
        }
    }
    return false;
}

// if Only Choice rule applies to given row, return column index of only empty square, otherwise return false
function checkRowForOnlyChoiceRule(sudoku, row) {
    if (sudoku[row].filter(x => x === 0).length === 1) {
        return sudoku[row].indexOf(0);
    }
    return false;
}

// if Only Choice rule applies to given col, return row index of only empty square, otherwise return false
function checkColumnForOnlyChoiceRule(sudoku, col) {
    columnArray = getColumnArray(sudoku, col);
    if (columnArray.filter(x => x === 0).length === 1) {
        return columnArray.indexOf(0);
    }
    return false;
}

// if Only Choice rule applies to given col, return row index of only empty square, otherwise return false
function checkBlockForOnlyChoiceRule(sudoku, upperLeftCellIndex) {
    blockArray = getBlockArray(sudoku, upperLeftCellIndex);
    if (blockArray.filter(x => x === 0).length === 1) {
        let row = upperLeftCellIndex[0] + Math.floor(blockArray.indexOf(0) / BLOCK_SIZE);
        let col = upperLeftCellIndex[1] + blockArray.indexOf(0) % BLOCK_SIZE;
        return [row, col];
    }
    return false;
}

// 2: ONLY SQUARE RULE (Single Position, cost 100, 100)

// 3: SINGLE POSSIBILITY RULE (Single Candidate. cost 100, 100)
// -- Look at single square, check row, col, and square for all possible
function findSinglePossibilityRule(sudoku, emptyCells) {
    for (let emptyCellIndex = 0; emptyCellIndex < emptyCells.length; emptyCellIndex++) {
        let row = emptyCells[emptyCellIndex][0];
        let col = emptyCells[emptyCellIndex][1];
        let eliminatedValues = new Set();
        otherValuesInRow(sudoku, row, col).forEach(value => eliminatedValues.add(value));
        otherValuesInColumn(sudoku, row, col).forEach(value => eliminatedValues.add(value));
        otherValuesInBlock(sudoku, row, col).forEach(value => eliminatedValues.add(value));
        if (eliminatedValues.size == 8) {
            for (value = 1; value < 10; value++) {
                if (!eliminatedValues.has(value)) {
                    return [row, col, value, `According to the Single Possibility Rule, the value in (${row+1}, ${col+1}) must be ${value} because all other values are eliminated within the row, column, and block.`];
                }
            }
        }
    }
}

function otherValuesInRow(sudoku, row, col) {
    return sudoku[row].filter(square => square !== 0);
}

function otherValuesInColumn(sudoku, row, col) {
    return getColumnArray(sudoku, col).filter(square => square !== 0);
}

function otherValuesInBlock(sudoku, row, col) {
    let topRow = Math.floor(row / BLOCK_SIZE) * BLOCK_SIZE;
    let leftColumn = Math.floor(col / BLOCK_SIZE) * BLOCK_SIZE;
    return getBlockArray(sudoku, [topRow, leftColumn]).filter(square => square !== 0);
}

// 4: TWO OUT OF THREE RULE

// 5: SHARED SUBGROUP RULE

// 6: NAKED TWIN RULE

// 7: HIDDEN TWIN RULE

// 8: X WING RULE

// 9: SWORDFISH RULE

// 10: ALTERNATE PAIR RULE

// 11: HOOK RULE

// 12: TRIAL AND ERROR RULE

//#endregion

//#region Array helper functions

function getRowArrayFromBlockArray(blocks) {
    let rowArray = [];
    for (let blockBase = 0; blockBase < 9; blockBase += 3) {
        for (let x = 0; x < 3; x++) {
            let row = [];
            for (let y = 0; y < 3; y++) {
                row.push(blocks[blockBase + y][x]);
            }
            rowArray.push([].concat.apply([], row));
        }
    }
    return rowArray;
}

function getColumnArray(sudoku, col) {
    let colArray = [];
    for (let row = 0; row < sudoku.length; row++) {
        colArray.push(sudoku[row][col]);
    }
    return colArray;
}

function getBlockArray(sudoku, upperLeftCellIndex) {
    let blockArray = [];
    let startingRow = upperLeftCellIndex[0];
    let startingCol = upperLeftCellIndex[1];
    for (let row = startingRow; row < startingRow + BLOCK_SIZE; row++) {
        for (let col = startingCol; col < startingCol + BLOCK_SIZE; col++) {
            blockArray.push(sudoku[row][col]);
        }
    }
    return blockArray;
}

function shuffle(array) {
    var tmp, current, top = array.length;
    if (top) while (--top) {
        current = Math.floor(Math.random() * (top + 1));
        tmp = array[current];
        array[current] = array[top];
        array[top] = tmp;
    }
    return array;
}

function getSudokuStringFromRowArray(rowArray) {
    let sudokuString = "";
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            sudokuString += rowArray[row][col];
        }
    }
    return sudokuString;
}

//#endregion

