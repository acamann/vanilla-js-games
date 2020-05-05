document.addEventListener('DOMContentLoaded', () => {
    // add 42 divs to grid, with 'bottom' 7 having class
    const grid = document.querySelector('#grid')
    for (let i = 0; i < 42; i++) {
        var cell = document.createElement('div')
        grid.appendChild(cell)
    }


    const squares = document.querySelectorAll('#grid div')
})