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
    
    
});