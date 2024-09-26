// Deep Biswas - 200554124
// Import the prompt module
const prompt = require('prompt');
// Initialize the game
console.log("Welcome to Rock, Paper, Scissors using Node!");
console.log("You can exit the game anytime by using Ctrl+C");
console.log("Please enter : R, P or S to play the game");
// Define the validation schema
const validation = {
    properties: {
        Choice: {
        pattern: /^[rpsRPS]$/,
        message: "Choice must be R, P, or S",
        required: true
        }
    }
};
// Start the prompt
prompt.start();
prompt.get(validation, function (err, result) {
    // Get the user's choice
    if (err) {
        console.error(err);
        return;
    }
    let choice = result.Choice.toUpperCase();
    if (choice === "R") {
        console.log("You Chose: Rock");
    }
    else if (choice === "P") {
        console.log("You Chose: Paper");
    }
    else if (choice === "S") {
        console.log("You Chose: Scissors");
    }
    // Get the computer's choice
    const randomNum = Math.random();
    let computerChoice;
    if (randomNum <= 0.34) {
        computerChoice = "Paper";
    } else if (randomNum <= 0.67) {
        computerChoice = "Scissors";
    } else {
        computerChoice = "Rock";
    }
    console.log(`Computer Chose: ${computerChoice}`);
    // Implement the game logic
    switch (choice) {
        case "R":
            if (computerChoice === "Rock") {
                console.log("It's a tie!");
            } else if (computerChoice === "Paper") {
                console.log("Computer Wins!");
            } else {
                console.log("User Wins!");
            }
            break;
        case "P":
            if (computerChoice === "Rock") {
                console.log("User Wins!");
            } else if (computerChoice === "Paper") {
                console.log("It's a tie!");
            } else {
                console.log("Computer Wins!");
            }
            break;
        case "S":
            if (computerChoice === "Rock") {
                console.log("Computer Wins!");
            } else if (computerChoice === "Paper") {
                console.log("User Wins!");
            } else {
                console.log("It's a tie!");
            }
            break;
    }
});