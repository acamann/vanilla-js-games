const squares = document.querySelectorAll('.square')
const mole = document.querySelectorAll('.mole')
const timeLeft = document.querySelector('#time-left')
let score = document.querySelector('#score')

let result = 0
let currentTime = timeLeft.textContent

function randomSquare() {
    clearFlies()
    let randomPosition = squares[Math.floor(Math.random() * 9)]
    randomPosition.classList.add('fly')
    currentFlyId = randomPosition.id
}

function clearFlies() {
    squares.forEach(square => {
        square.classList.remove('fly')
        square.classList.remove('swat')
    })
}

squares.forEach(square => {
    square.addEventListener('mouseup', () => {
        if(square.id === currentFlyId) {
            square.classList.remove('fly')
            square.classList.add('swat')
            result = result + 1
            score.textContent = result
        }
    })
})

let flyId = setInterval(randomSquare, 900)

function countDown() {
    currentTime--
    timeLeft.textContent = currentTime

    if(currentTime === 0) {
        clearFlies()
        clearInterval(timerId)
        clearInterval(flyId)
        alert('GAME OVER! Your final score is ' + result)
    }
}

let timerId = setInterval(countDown, 1000)