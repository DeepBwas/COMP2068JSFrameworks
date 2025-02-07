// Deep Biswas - 200554124
// Import necessary modules
const http = require('http');
const connect = require('connect');

// Create a server that listens to localhost:3000
// The server should handle URLs like http://localhost:3000/lab3?method=add&x=16&y=4
// The methods can be add, subtract, multiply, and divide
// And the x and y can be any Number (integer or float)
const app = connect();

app.use('/lab3', (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const method = url.searchParams.get('method');
    const x = url.searchParams.get('x');
    const y = url.searchParams.get('y');

    // Parameters for Validation query parameters
    if (!method || x === null || y === null || isNaN(Number(x)) || isNaN(Number(y))) { // Checking if method, x, or y is missing or not a number
        res.statusCode = 400;
        res.end('Error: Invalid query parameters. Please use the format /lab3?method=add&x=16&y=4 where method can be add, subtract, multiply, or divide, and x and y are numbers.');
        return;
    }

    // Checking for any other query parameters
    const allowedParams = ['method', 'x', 'y']; // Only method, x, and y are allowed
    for (const param of url.searchParams.keys()) { // Checking if any other bad query parameters are present
        if (!allowedParams.includes(param)) {
            res.statusCode = 400;
            res.end('Error: Invalid query parameters. Only method, x, and y are allowed.');
            return;
        }
    }
    
    // Convert x and y to numbers
    const numX = Number(x);
    const numY = Number(y);

    let result = 0;

    if (method === 'add') {
        result = numX + numY;
    } else if (method === 'subtract') {
        result = numX - numY;
    } else if (method === 'multiply') {
        result = numX * numY;
    } else if (method === 'divide') {
        result = numX / numY;
    } else {
        res.statusCode = 400;
        res.end('Error: Invalid method. Please use one of the following methods: add, subtract, multiply, divide.');
        return;
    }

    let methodSymbol;
    if (method === 'add') {
        methodSymbol = '+';
    } else if (method === 'subtract') {
        methodSymbol = '-';
    } else if (method === 'multiply') {
        methodSymbol = '*';
    } else if (method === 'divide') {
        methodSymbol = '/';
    }

    // The response should show the calculation and the result
    // The output should be like this 16 + 4 = 20
    res.end(`${numX} ${methodSymbol} ${numY} = ${result}`);
});

// Middleware to handle requests to /
app.use('/', (req, res) => {
    res.end('Welcome to the calculator server. Use /lab3 with method, x, and y query parameters.');
});

// Creating an HTTP server and pass the connect app as the request handler
const server = http.createServer(app);

// Make the server listen to port 3000
server.listen(3000, () => {
    console.log('Server is listening on http://localhost:3000');
});