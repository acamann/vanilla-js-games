document.addEventListener('DOMContentLoaded', () => {

    //card options
    const cardArray = [
        {
            name: 'loader',
            img: 'images/001-trucking.png'
        },
        {
            name: 'delivery',
            img: 'images/002-trucking-1.png'
        },
        {
            name: 'mixer',
            img: 'images/003-trucking-2.png'
        },
        {
            name: 'dump',
            img: 'images/004-trucking-3.png'
        },
        {
            name: 'freight',
            img: 'images/005-trucking-4.png'
        },
        {
            name: 'tractor',
            img: 'images/006-trucking-5.png'
        },
        {
            name: 'forklift',
            img: 'images/007-trucking-6.png'
        },
        {
            name: 'roller',
            img: 'images/008-trucking-7.png'
        },
        {
            name: 'digger',
            img: 'images/009-trucking-8.png'
        },
        {
            name: 'dozer',
            img: 'images/010-trucking-9.png'
        }
    ]

    // double the cards
    cardArray.push(...cardArray)

    cardArray.sort(() => 0.5 - Math.random())

    const grid = document.querySelector('#grid')
    const resultDisplay = document.querySelector('#result')
    const alertDisplay = document.querySelector('#alert')
    var cardsChosen = []
    var cardsChosenId = []
    var cardsWon = []
    var score = 0
    var flipTimer
    var alertTimer

    //create your board
    function createBoard() {
        for (let i = 0; i < cardArray.length; i++) {
            var card = document.createElement('span')
            //card.setAttribute('src', 'images/card-back.png')
            card.setAttribute('data-id', i)
            card.setAttribute('class', 'not-flipped card')
            card.addEventListener('click', flipCard)
            grid.appendChild(card)
        }
    }

    // check for matches
    function checkForMatch() {
        var cards = document.querySelectorAll('.card')
        const optionOneId = cardsChosenId[0]
        const optionTwoId = cardsChosenId[1]
        if (cardsChosen[0] === cardsChosen[1]) {   
            displayAlert(`You found the ${cardsChosen[0]}!`, 'match')         
            cards[optionOneId].setAttribute('class', 'matched card')
            cards[optionOneId].removeAttribute('style')
            cards[optionOneId].removeEventListener('click', flipCard)
            cards[optionTwoId].setAttribute('class', 'matched card')
            cards[optionTwoId].removeAttribute('style')
            cards[optionTwoId].removeEventListener('click', flipCard)
            cardsWon.push(cardsChosen)
            score += 100
        } else {
            displayAlert('Sorry, try again', 'no-match')
            cards[optionOneId].setAttribute('class', 'not-flipped card')
            cards[optionOneId].removeAttribute('style')
            cards[optionTwoId].setAttribute('class', 'not-flipped card')
            cards[optionTwoId].removeAttribute('style')
        }
        cardsChosen = []
        cardsChosenId = []
        resultDisplay.textContent = score
        if (cardsWon.length === cardArray.length / 2) {
            grid.setAttribute('class', 'victory')
            displayAlert('Victory!', 'match')
        }
    }

    // flip your card
    function flipCard() {
        if (cardsChosen.length === 2) return
        var cardId = this.getAttribute('data-id')
        if (cardsChosenId.includes(cardId)) return
        cardsChosen.push(cardArray[cardId].name)
        cardsChosenId.push(cardId)
        this.setAttribute('style', `background-image: url('${cardArray[cardId].img}')`)
        this.setAttribute('class', 'flipped card')
        if (cardsChosen.length === 2) {
            flipTimer = setTimeout(checkForMatch, 1500)
        }
    }

    function displayAlert(text, className) {
        alertDisplay.textContent = text
        alertDisplay.setAttribute('class', className)
        alertTimer = setTimeout(function() { 
            alertDisplay.textContent = ''
            alertDisplay.removeAttribute('class') 
        }, 2000)
    }

    createBoard()
})