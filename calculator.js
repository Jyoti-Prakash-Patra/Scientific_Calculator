// Required HTML elements
const input = document.getElementById("inputBox");
const buttons = document.querySelectorAll(".buttons-grid button");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// Variables
let displayString = "";
let lastAnswer = 0;
let justCalculated = false;

const MAX_INPUT_LENGTH = 60;
const operators = ["+", "-", "*", "/", "^", "%"];

// Handle calculator button events
buttons.forEach(button => {
    button.addEventListener("click", () => {
        const value = button.innerText;
        processAction(value);
    });
});

// Handle button and keyboard actions
function processAction(value) {
    switch (value) {
        case "=":
        case "Enter":
            if (displayString !== "") {
                calculateResult();
            }
            break;
        case "AC":
        case "Escape":
            displayString = "";
            input.value = "";
            justCalculated = false;
            break;
        case "DEL":
        case "Backspace":
            if (!justCalculated) {
                displayString = displayString.slice(0, -1);
                input.value = displayString;
            }
            break;
        default:
            handleInput(value);
    }
}

// Handle user input and formatting
function handleInput(value) {
    if (displayString.length >= MAX_INPUT_LENGTH) return;

    let last = displayString.slice(-1);

    // Continue calculation after getting a result
    if (justCalculated) {
        if (operators.includes(value)) {
            displayString = lastAnswer.toString();
        } else {
            displayString = "";
        }
        justCalculated = false;
        last = displayString.slice(-1);
    }

    // Handle scientific functions
    if (["sin", "cos", "tan", "log", "ln", "√"].includes(value)) {
        if (displayString && (/\d/.test(last) || last === ")" || last === "π")) {
            displayString += "*";
        }
        displayString += value + "(";
        input.value = displayString;
        return;
    }

    // Handle PI value
    if (value === "π") {
        if (displayString && (/\d/.test(last) || last === ")")) {
            displayString += "*";
        }
        displayString += "π";
        input.value = displayString;
        return;
    }

    // Handle opening brackets
    if (value === "(") {
        if (displayString && (/\d/.test(last) || last === ")" || last === "π")) {
            displayString += "*";
        }
        displayString += "(";
        input.value = displayString;
        return;
    }

    // Validate closing brackets
    if (value === ")") {
        const open = (displayString.match(/\(/g) || []).length;
        const close = (displayString.match(/\)/g) || []).length;

        if (open <= close) return;
        if (operators.includes(last) || last === "(") return;

        displayString += ")";
        input.value = displayString;
        return;
    }

    // Handle decimal values
    if (value === ".") {
        let currentNumber = displayString.split(/[+\-*/%^()]/).pop();
        if (currentNumber.includes(".")) return;

        if (currentNumber === "" || currentNumber === "00") {
            displayString += "0";
        }
        displayString += ".";
        input.value = displayString;
        return;
    }

    // Handle mathematical operators
    if (operators.includes(value)) {
        if (displayString === "") {
            if (value === "-") {
                displayString = "-";
                input.value = displayString;
            }
            return;
        }

        if (last === "(") {
            if (value === "-") {
                displayString += "-";
                input.value = displayString;
            }
            return;
        }

        if (operators.includes(last)) {
            displayString = displayString.slice(0, -1) + value;
        } else {
            displayString += value;
        }
        input.value = displayString;
        return;
    }

    // Handle number inputs
    if (/^\d+$/.test(value)) {
        let currentNumber = displayString.split(/[+\-*/%^()]/).pop();

        if (currentNumber === "0" && value !== "0" && value !== "00") {
            displayString = displayString.slice(0, -1) + value;
        } else if (currentNumber === "0" && (value === "0" || value === "00")) {
            return;
        } else {
            displayString += value;
        }
        input.value = displayString;
        return;
    }
}

// Calculate final expression result
function calculateResult() {
    try {
        let formula = displayString;

        // Add missing closing brackets automatically
        let open = (formula.match(/\(/g) || []).length;
        let close = (formula.match(/\)/g) || []).length;
        while (open > close) {
            formula += ")";
            close++;
        }

        // Convert calculator symbols into JavaScript format
        formula = formula.replace(/sin\(([^()]*[πMath\.PI][^()]*)\)/g, 'sin_rad($1)');
        formula = formula.replace(/cos\(([^()]*[πMath\.PI][^()]*)\)/g, 'cos_rad($1)');
        formula = formula.replace(/tan\(([^()]*[πMath\.PI][^()]*)\)/g, 'tan_rad($1)');

        formula = formula.replace(/π/g, "Math.PI");
        formula = formula.replace(/(?<![0-9])e(?![0-9])/g, "Math.E");
        formula = formula.replace(/\^/g, "**");
        formula = formula.replace(/(\d+(\.\d+)?)%/g, "($1/100)");

        let previousFormula;
        do {
            previousFormula = formula;

            // Calculate square root values
            formula = formula.replace(/√\(([^()]+)\)/g, (_, val) => {
                const number = eval(val);
                if (number < 0) throw new Error("Math Error");
                return Math.sqrt(number);
            });

            // Calculate logarithm values
            formula = formula.replace(/log\(([^()]+)\)/g, (_, val) => {
                const number = eval(val);
                if (number <= 0) throw new Error("Math Error");
                return Math.log10(number);
            });

            // Calculate natural Log
            formula = formula.replace(/ln\(([^()]+)\)/g, (_, val) => {
                const number = eval(val);
                if (number <= 0) throw new Error("Math Error");
                return Math.log(number);
            });

            // Handle trigonometric functions in radians
            formula = formula.replace(/sin_rad\(([^()]+)\)/g, (_, val) => {
                const result = Math.sin(eval(val));
                return Math.abs(result) < 1e-12 ? 0 : result;
            });

            formula = formula.replace(/cos_rad\(([^()]+)\)/g, (_, val) => {
                const result = Math.cos(eval(val));
                return Math.abs(result) < 1e-12 ? 0 : result;
            });

            formula = formula.replace(/tan_rad\(([^()]+)\)/g, (_, val) => {
                const valEval = eval(val);
                if (Math.abs(Math.cos(valEval)) < 1e-12) throw new Error("Math Error");
                const result = Math.tan(valEval);
                return Math.abs(result) < 1e-12 ? 0 : result;
            });

            // Handle trigonometric functions in degrees
            formula = formula.replace(/sin\(([^()]+)\)/g, (_, val) => {
                const result = Math.sin(eval(val) * Math.PI / 180);
                return Math.abs(result) < 1e-12 ? 0 : result;
            });

            formula = formula.replace(/cos\(([^()]+)\)/g, (_, val) => {
                const result = Math.cos(eval(val) * Math.PI / 180);
                return Math.abs(result) < 1e-12 ? 0 : result;
            });

            formula = formula.replace(/tan\(([^()]+)\)/g, (_, val) => {
                const deg = eval(val);
                if (Math.abs(Math.cos(deg * Math.PI / 180)) < 1e-12) throw new Error("Math Error");
                const result = Math.tan(deg * Math.PI / 180);
                return Math.abs(result) < 1e-12 ? 0 : result;
            });

        } while (formula !== previousFormula);

        // Evaluate final result
        let result = eval(formula);

        if (!Number.isFinite(result) || Number.isNaN(result)) {
            throw new Error("Math Error");
        }

        // Fix floating point calculation issues
        result = parseFloat(result.toPrecision(12));

        lastAnswer = result;
        addHistoryItem(displayString, result);

        displayString = result.toString();
        input.value = displayString;
        justCalculated = true;

    } catch (error) {
        // Show error for invalid calculations
        console.error(error);
        input.value = "Math Error";
        displayString = "";
        justCalculated = false;

        setTimeout(() => {
            if (input.value === "Math Error") input.value = "";
        }, 1200);
    }
}

// Add calculation to history
function addHistoryItem(expression, result) {
    const li = document.createElement("li");
    li.innerHTML = `
        <div class="history-content">
            <span class="expr">${expression}</span>
            <span class="res">${result}</span>
        </div>
        <button class="delete-history">✕</button>
    `;

    li.querySelector(".history-content").addEventListener("click", () => {
        displayString = result.toString();
        input.value = displayString;
        justCalculated = true;
    });

    li.querySelector(".delete-history").addEventListener("click", (event) => {
        event.stopPropagation();
        li.remove();
        saveHistory();
    });

    historyList.prepend(li);

    while (historyList.children.length > 20) {
        historyList.removeChild(historyList.lastChild);
    }
    saveHistory();
}

// Save history data in browser storage
function saveHistory() {
    localStorage.setItem("calculatorHistory", historyList.innerHTML);
}

// Load previous calculations
function loadHistory() {
    const history = localStorage.getItem("calculatorHistory");
    if (!history) return;

    historyList.innerHTML = history;

    historyList.querySelectorAll("li").forEach(li => {
        li.querySelector(".history-content").addEventListener("click", () => {
            const value = li.querySelector(".res").innerText;
            displayString = value;
            input.value = value;
            justCalculated = true;
        });

        li.querySelector(".delete-history").addEventListener("click", (event) => {
            event.stopPropagation();
            li.remove();
            saveHistory();
        });
    });
}

// Clear calculation history
clearHistoryBtn.addEventListener("click", () => {
    historyList.innerHTML = "";
    localStorage.removeItem("calculatorHistory");
});

// Support keyboard input
document.addEventListener("keydown", (event) => {
    const key = event.key;

    if (/[0-9]/.test(key) || operators.includes(key) || key === ".") {
        processAction(key);
    } else if (key === "Enter" || key === "Backspace" || key === "Escape") {
        processAction(key);
    }
});

// Load saved history when page opens
loadHistory();