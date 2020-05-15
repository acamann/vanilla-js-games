// SUDOKU Generation and Solving
// -- Andy Camann

// research paper on generating: https://sites.math.washington.edu/~morrow/mcm/team2280.pdf
// guides to solving: https://www.sudokudragon.com/sudokututorials.htm
// difficulty scoring and rule costs: https://www.sudokuoftheday.com/about/difficulty/ - forum post where it was first proposed: https://web.archive.org/web/20060712220000/http://www.setbb.com/phpbb/viewtopic.php?t=142&mforum=sudoku

// a band is a set of three blocks that are horizontally contiguous
// a stack is the vertical equivalent.

//#region Sudoku Classes
class SolutionStep {
    constructor(stepCode, row, col, value, state, explanation, cost = null) {
        this.stepCode = stepCode;
        this.row = row;
        this.col = col;
        this.value = value;
        this.state = Array.isArray(state) ? 
                        state.map(row => row.join()) :
                        state;
        this.explanation = explanation;
        this.cost = cost;
    }
}

class Sudoku {
    constructor(puzzle, solution, solutionSteps, difficulty) {
        this.puzzle = puzzle;
        this.solution = solution;
        this.solutionSteps = solutionSteps;
        this.difficulty = difficulty;
    }
}
//#endregion

//#region Global Constants & Variables

// Technique Costs to calculate Difficulty
const TECHNIQUE_COST = {
    ONLY_CHOICE: { INITIAL: 100, RECURRING: 100 },
    SINGLE_CANDIDATE: { INITIAL: 100, RECURRING: 100 },
    TWO_OUT_OF_THREE: { INITIAL: 250, RECURRING: 150 },
    CANDIDATE_LINES: { INITIAL: 350, RECURRING: 200 },
    DOUBLE_PAIRS: { INITIAL: 500, RECURRING: 250 },
    MULTIPLE_LINES: { INITIAL: 700, RECURRING: 500 },
    NAKED_PAIR: { INITIAL: 750, RECURRING: 500 },
    HIDDEN_PAIR: { INITIAL: 1500, RECURRING: 1200 }
}

// Puzzle Difficulty Ranges
const DIFFICULTY_RANGE = {
    BEGINNER: { MIN: 3600, MAX: 4500 },
    EASY: { MIN: 4300, MAX: 5500 },
    MEDIUM: { MIN: 5300, MAX: 6900 },
    TRICKY: { MIN: 6500, MAX: 9300 },
    FIENDISH: { MIN: 8300, MAX: 14000 },
    DIABOLICAL: {MIN: 11000, MAX: 25000}
}

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
var pencilMarks = [
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

//#region Init and Manipulate DOM

async function init() {    
    createGridInDOM('puzzle');
    createGridInDOM('solving-process');
    createGridInDOM('pencil-marks');
    createGridInDOM('solution');


    console.time('Generate Puzzle With Appropriate Difficulty');
    generatePuzzle(DIFFICULTY_RANGE.MEDIUM);
    console.timeEnd('Generate Puzzle With Appropriate Difficulty');
    solvingProcess = puzzle.map(row => row.slice());

    placeSudokuOnGrid('puzzle', puzzle);
    placeSudokuOnGrid('solving-process', solvingProcess);
    placeSudokuOnGrid('solution', solution);

    console.time('Solve Puzzle Using Human Approaches');
    let solutionSteps = solvePuzzleUsingHumanSteps(solvingProcess);
    displayStepsInDOM('#sudoku-string', solutionSteps);
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
            } else if (Array.isArray(rowArray[row][col])) {
                cell.setAttribute('class', `row-${row} col-${col} pencil-marks`);
                cell.innerText = rowArray[row][col].join(' ');
            } else {
                cell.setAttribute('class', `row-${row} col-${col}`);
                cell.innerText = rowArray[row][col];
            }
        }
    }
}

function displayStepsInDOM(domID, solutionSteps) {
    document.querySelector(domID).innerHTML += `Initial Empty Squares: ${getIndicesOfEmptyCells(puzzle).length}<br />`;
    for (let step = 0; step < solutionSteps.length; step++) {
        let solutionStep = solutionSteps[step];
        if (solutionStep.stepCode == 'uns') {
            document.querySelector(domID).innerHTML += solutionStep.explanation;
        } else if (solutionStep.stepCode == 'slv') {
            document.querySelector(domID).innerHTML += `Solution Found! Difficulty: ${solutionStep.cost}`;
        } else {
            highlightCell('solving-process', solutionStep.row, solutionStep.col, solutionStep.value);
            document.querySelector(domID).innerHTML += `${solutionStep.explanation} (${solutionStep.cost})<br />${solutionStep.state}<br />`;
        }
    }
}

// #endregion

//#region Generate New Puzzle

function generatePuzzle(difficultyRange) {
    const INITIAL_CELLS_TO_ERASE = 40;
    
    console.time('Generate New Random Puzzle Solution');
    solvePuzzleUsingBacktracking(solution, getIndicesOfEmptyCells(solution)); // generate random puzzle solution state from empty grid
    console.timeEnd('Generate New Random Puzzle Solution');
    
    applyRandomTransformations(solution);
    
    let numberOfSolutions = 0;    
    while ( numberOfSolutions != 1 || !puzzleIsSolvableUsingHumanSteps(puzzle)) {
        puzzle = solution.map(row => row.slice());
        erasedCells = [];
    
        for (let i = 0; i < INITIAL_CELLS_TO_ERASE;) {
            if (erasedCell = eraseRandomCell(puzzle)) {
                erasedCells.push(erasedCell);
                i++;
            }
        }        
        let puzzleToCheck = puzzle.map(row => row.slice());
        numberOfSolutions = checkForUniqueSolutions(puzzleToCheck, getIndicesOfEmptyCells(puzzleToCheck));        
    } // block completes when the initially seeded puzzle has a unique solution

    let attemptedCells = erasedCells.map(cell => cell.slice());
    while (puzzleIsOutOfDifficultyRange(puzzle, difficultyRange.MIN, difficultyRange.MAX)) {
        if (puzzleIsSolvableUsingHumanSteps(puzzle)) {
            if (puzzleIsTooEasy(puzzle, difficultyRange.MIN)) {
                if (erasedCell = eraseRandomCell(puzzle)) {
                    //console.log(`puzzle is too easy: ${puzzle.toString()}`);
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
                    console.log('Attempted to remove all possible cells without achieving desired difficulty, starting over with a new random puzzle');
                    generatePuzzle(difficultyRange);
                    break;
                }
            } else if (puzzleIsTooHard(puzzle, difficultyRange.MAX)) {
                //console.log(`puzzle is too hard: ${puzzle.toString()}`);
                let erasedCell = erasedCells.pop();
                let row = erasedCell[0];
                let col = erasedCell[1];
                puzzle[row][col] = solution[row][col];
            }
        } else {
            // if puzzle can't be solved using human steps
            generatePuzzle(difficultyRange);
            break;
        }            
    }
}

function eraseRandomCell(rowArray) {
    let row = Math.floor(Math.random() * 9);
    let col = Math.floor(Math.random() * 9);
    if (rowArray[row][col] == 0) return false;
    rowArray[row][col] = 0;
    return [row, col];
}

function puzzleIsSolvableUsingHumanSteps(sudoku) {
    let solutionSteps = solvePuzzleUsingHumanSteps(sudoku.map(row => row.slice()));
    return solutionSteps[solutionSteps.length - 1].stepCode == 'slv';
}

function puzzleIsOutOfDifficultyRange(sudoku, difficultyMin, difficultyMax) {
    return (puzzleIsTooEasy(sudoku, difficultyMin) || puzzleIsTooHard(sudoku, difficultyMax));
}

function puzzleIsTooEasy(sudoku, difficultyMin) {
    let solutionSteps = solvePuzzleUsingHumanSteps(sudoku.map(row => row.slice()));
    let difficultyScore = calculateDifficultyScore(solutionSteps);
    return (difficultyScore < difficultyMin);
}

function puzzleIsTooHard(sudoku, difficultyMax) {
    let solutionSteps = solvePuzzleUsingHumanSteps(sudoku.map(row => row.slice()));
    let difficultyScore = calculateDifficultyScore(solutionSteps);
    return (difficultyScore > difficultyMax);
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

function solvePuzzleUsingHumanSteps(sudoku) {
    let emptyCells = getIndicesOfEmptyCells(sudoku);
    let pencilMarks = getPencilMarksForEachSquare(sudoku);
    //placeSudokuOnGrid('pencil-marks', pencilMarks);
    let solutionSteps = [];
    while (solutionStep = findHumanSolutionStep(sudoku, pencilMarks, emptyCells)) {
        solutionSteps.push(solutionStep);
        sudoku[solutionStep.row][solutionStep.col] = solutionStep.value;
        emptyCells = emptyCells.filter(cell => !(cell[0]==solutionStep.row && cell[1]==solutionStep.col));
    } 
    if (emptyCells.length == 0) {
        let difficulty = calculateDifficultyScore(solutionSteps);
        solutionSteps.push(new SolutionStep("slv", null, null, null, sudoku, 'Puzzle Solved!', difficulty)); 
    } else {
        solutionSteps.push(new SolutionStep("uns", null, null, null, sudoku, 'Unsolvable using available human rules.'));
    }
    return solutionSteps;
}

function getPencilMarksForEachSquare(sudoku) {
    let pencilMarks = sudoku.map(row => row.slice());
    for (let row = 0; row < pencilMarks.length; row++) {
        for (let col = 0; col < pencilMarks[row].length; col++) {
            if (pencilMarks[row][col] == 0 || Array.isArray(pencilMarks[row][col])) {
                let possibleValuesForSquare = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                otherValuesInRow(sudoku, row, col).forEach(value => possibleValuesForSquare.delete(value));
                otherValuesInColumn(sudoku, row, col).forEach(value => possibleValuesForSquare.delete(value));
                otherValuesInBlock(sudoku, row, col).forEach(value => possibleValuesForSquare.delete(value));
                pencilMarks[row][col] = Array.from(possibleValuesForSquare);
            }
        }
    }
    return pencilMarks;
}

function findHumanSolutionStep(sudoku, pencilMarks, emptyCells) {
    let humanSolutionStep = findOnlyChoiceRule(sudoku) ||
                            findSingleCandidateRule(sudoku, pencilMarks) ||
                            findTwoOutOfThreeRule(sudoku) ||
                            findNakedTwinRule(sudoku, pencilMarks) ||
                            false;
    return humanSolutionStep;
}

// 1: ONLY CHOICE RULE (cost: 100, 100)

// returns [row, col, value, explanation] or false if the Only Choice Rule cannot be applied anywhere
function findOnlyChoiceRule(sudoku) {
    for (let row = 0; row < 9; row++) {
        if (col = checkRowForOnlyChoiceRule(sudoku, row)) {
            for (let value = 1; value < 10; value++) {
                if (checkRow(sudoku, row, value)) {
                    return new SolutionStep('ocr', row, col, value, sudoku, `According to the Only Choice Rule, the value in (${row+1}, ${col+1}) must be ${value} because the row already contains all other possible values.`);
                }
            }
        }
    }
    for (let col = 0; col < 9; col++) {
        if (row = checkColumnForOnlyChoiceRule(sudoku, col)) {
            for (let value = 1; value < 10; value++) {
                if (checkColumn(sudoku, col, value)) {
                    return new SolutionStep('ocr', row, col, value, sudoku, `According to the Only Choice Rule, the value in (${row+1}, ${col+1}) must be ${value} because the column already contains all other possible values.`);
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
                        return new SolutionStep('ocr', row, col, value, sudoku, `According to the Only Choice Rule, the value in (${row+1}, ${col+1}) must be ${value} because the block already contains all other possible values.`);
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

// 2: SINGLE CANDIDATE (cost 100, 100)
function findSingleCandidateRule(sudoku, pencilMarks) {
    for (let row = 0; row < pencilMarks.length; row++) {
        for (let col = 0; col < pencilMarks[row].length; col++) {
            // if the square is not solved (is an array), but there is only one possible value
            if (Array.isArray(pencilMarks[row][col]) && pencilMarks[row][col].length == 1) {
                let value = pencilMarks[row][col][0];
                sudoku[row][col] = value;
                pencilMarks[row][col] = value;
                return new SolutionStep('scr', row, col, value, sudoku, `According to the Single Candidate Rule, the value in (${row+1}, ${col+1}) must be ${value} because all other possibilities are present within the row, column, and block.`); 
            }
        }
    }
}


// // 3: SINGLE POSSIBILITY RULE (Single Candidate. cost 100, 100)
// // -- Look at single square, check row, col, and square for all possible
// function findSinglePossibilityRule(sudoku, emptyCells) {
//     for (let emptyCellIndex = 0; emptyCellIndex < emptyCells.length; emptyCellIndex++) {
//         let row = emptyCells[emptyCellIndex][0];
//         let col = emptyCells[emptyCellIndex][1];
//         let eliminatedValues = new Set();
//         otherValuesInRow(sudoku, row, col).forEach(value => eliminatedValues.add(value));
//         otherValuesInColumn(sudoku, row, col).forEach(value => eliminatedValues.add(value));
//         otherValuesInBlock(sudoku, row, col).forEach(value => eliminatedValues.add(value));
//         if (eliminatedValues.size == 8) {
//             for (value = 1; value < 10; value++) {
//                 if (!eliminatedValues.has(value)) {
//                     return new SolutionStep('spr', row, col, value, null, `According to the Single Possibility Rule, the value in (${row+1}, ${col+1}) must be ${value} because all other values are eliminated within the row, column, and block.`);
//                 }
//             }
//         }
//     }
// }



// 4: TWO OUT OF THREE RULE
// -- look at three rows at a time, check for certain number.  in two rows?  check final block & column
function findTwoOutOfThreeRule(sudoku) {
    for (let topRow = 0; topRow < 9; topRow += 3) {
        for (let value = 1; value < 10; value++) {
            let indexesOfValueInBlockRows = [];
            indexesOfValueInBlockRows.push(sudoku[topRow].indexOf(value));
            indexesOfValueInBlockRows.push(sudoku[topRow+1].indexOf(value));
            indexesOfValueInBlockRows.push(sudoku[topRow+2].indexOf(value));
            if (indexesOfValueInBlockRows.filter(index => index == -1).length == 1) {
                // identify single row that is missing the value
                let relativeRowOfMissingValueWithinBlock = indexesOfValueInBlockRows.indexOf(-1);
                let row = topRow + relativeRowOfMissingValueWithinBlock;
                
                // find left most column of the block that is missing this value
                let leftColOfBlock = new Set([0, 3, 6]);
                indexesOfValueInBlockRows.map(index => leftColOfBlock.delete(Math.floor(index / 3) * 3));
                let leftColIndex = leftColOfBlock.values().next().value;
                
                // from the three cells within that block & row: identify the empty squares
                let columnIndexesMissingValue = new Set();
                for (let colToCheck = leftColIndex; colToCheck < leftColIndex + BLOCK_SIZE; colToCheck++) {
                    //console.log(`Row=${row}, Col=${col}, Value=${sudoku[row][col]}`);
                    if (sudoku[row][colToCheck] == 0) {
                        columnIndexesMissingValue.add(colToCheck);
                    }
                }

                 // remove possible cells from the list by checking the column to see if that value already exists 
                for (let col in columnIndexesMissingValue) {
                    if (!checkColumn(sudoku, col, value)) {
                        columnIndexesMissingValue.delete(col);
                    }
                }

                // if there is only one cell left, we found a Two out of Three Rule!
                if (columnIndexesMissingValue.size == 1) {
                    let col = columnIndexesMissingValue.values().next().value;
                    return new SolutionStep('2o3', row, col, value, sudoku, `According to the Two Out Of Three Rule, the value in (${row+1}, ${col+1}) must be ${value} because because the value shows up in the other two columns within this band and there is only one remaining possibility within this block`);
                }                
            }
        }
    }
    for (let leftCol = 0; leftCol < 9; leftCol += 3) {
        for (let value = 1; value < 10; value++) {
            let indexesOfValueInBlockCols = [];            
            indexesOfValueInBlockCols.push(getColumnArray(sudoku, leftCol).indexOf(value));
            indexesOfValueInBlockCols.push(getColumnArray(sudoku, leftCol+1).indexOf(value));
            indexesOfValueInBlockCols.push(getColumnArray(sudoku, leftCol+2).indexOf(value));
            if (indexesOfValueInBlockCols.filter(index => index == -1).length == 1) {
                // identify single col that is missing the value
                let relativeColOfMissingValueWithinBlock = indexesOfValueInBlockCols.indexOf(-1);
                let col = leftCol + relativeColOfMissingValueWithinBlock;
                
                // find top most row of the block that is missing this value
                let topRowOfBlock = new Set([0, 3, 6]);
                indexesOfValueInBlockCols.map(index => topRowOfBlock.delete(Math.floor(index / 3) * 3));
                let topRowIndex = topRowOfBlock.values().next().value;
                
                // from the three cells within that block & col: identify the empty squares
                let rowIndexesMissingValue = new Set();
                for (let rowToCheck = topRowIndex; rowToCheck < topRowIndex + BLOCK_SIZE; rowToCheck++) {
                    //console.log(`Row=${row}, Col=${col}, Value=${sudoku[row][col]}`);
                    if (sudoku[rowToCheck][col] == 0) {
                        rowIndexesMissingValue.add(rowToCheck);
                    }
                }

                 // remove possible cells from the list by checking the row to see if that value already exists 
                for (let row in rowIndexesMissingValue) {
                    if (!checkRow(sudoku, row, value)) {
                        rowIndexesMissingValue.delete(row);
                    }
                }

                // if there is only one cell left, we found a Two out of Three Rule!
                if (rowIndexesMissingValue.size == 1) {
                    let row = rowIndexesMissingValue.values().next().value;
                    return new SolutionStep('2o3', row, col, value, sudoku, `According to the Two Out Of Three Rule, the value in (${row+1}, ${col+1}) must be ${value} because the value shows up in the other two columns within this stack and there is only one remaining possibility within this block`);
                }                
            }
        }
    }
    return false;
}

// 5: SHARED SUBGROUP RULE

// 6: NAKED TWIN RULE
function findNakedTwinRule(sudoku, pencilMarks) {

}
// 7: HIDDEN TWIN RULE

// 8: X WING RULE

// 9: SWORDFISH RULE

// 10: ALTERNATE PAIR RULE

// 11: HOOK RULE

// 12: TRIAL AND ERROR RULE

function calculateDifficultyScore(solutionSteps) {
    if (solutionSteps.length == 0 || solutionSteps[solutionSteps.length - 1].stepCode == 'uns') return false;

    let difficultyScore = 0;
    let onlyChoiceRuleHasBeenUsed = false;
    let singleCandidateRuleHasBeenUsed = false;
    let twoOutOfThreeRuleHasBeenUsed = false;

    for (let stepIndex = 0; stepIndex < solutionSteps.length; stepIndex++) {
        let stepScore = 0;
        switch (solutionSteps[stepIndex].stepCode) {
            case 'ocr':
                stepScore = onlyChoiceRuleHasBeenUsed ? 
                            TECHNIQUE_COST.ONLY_CHOICE.RECURRING : 
                            TECHNIQUE_COST.ONLY_CHOICE.INITIAL;
                onlyChoiceRuleHasBeenUsed = true;
                break;
            case 'scr':
                stepScore = singleCandidateRuleHasBeenUsed ? 
                            TECHNIQUE_COST.SINGLE_CANDIDATE.RECURRING :
                            TECHNIQUE_COST.SINGLE_CANDIDATE.INITIAL;
                singleCandidateRuleHasBeenUsed = true;
                break;
            case '2o3':
                stepScore = twoOutOfThreeRuleHasBeenUsed ? 
                            TECHNIQUE_COST.TWO_OUT_OF_THREE.RECURRING :
                            TECHNIQUE_COST.TWO_OUT_OF_THREE.INITIAL;
                twoOutOfThreeRuleHasBeenUsed = true;
                break;
        }
        difficultyScore += stepScore;
        solutionSteps[stepIndex].cost = stepScore;  
    }    
    return difficultyScore;
}

//#endregion

//#region Array helper functions

function getEmptySudokuArray() {
    return [
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
}

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

function otherValuesInRow(sudoku, row, col) {
    return sudoku[row].filter((square, colIndex) => square !== 0 || colIndex !== col);
}

function otherValuesInColumn(sudoku, row, col) {
    return getColumnArray(sudoku, col).filter(square => square !== 0);
}

function otherValuesInBlock(sudoku, row, col) {
    let topRow = Math.floor(row / BLOCK_SIZE) * BLOCK_SIZE;
    let leftColumn = Math.floor(col / BLOCK_SIZE) * BLOCK_SIZE;
    return getBlockArray(sudoku, [topRow, leftColumn]).filter(square => square !== 0);
}

//#endregion

