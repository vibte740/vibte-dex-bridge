<?php
// Test script to simulate receiving webhook payload
// This creates sample data similar to what TradingView would send

header('Content-Type: text/html');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Webhook Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .payload { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .field { margin: 10px 0; }
        .label { font-weight: bold; display: inline-block; width: 120px; }
        .value { color: #333; }
        h1 { color: #2c3e50; }
        h2 { color: #3498db; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Webhook Payload Test</h1>
        
        <h2>Sample Buy Signal Payload</h2>
        <div class="payload">
            <div class="field"><span class="label">Side:</span><span class="value">buy</span></div>
            <div class="field"><span class="label">Symbol:</span><span class="value">AAPL</span></div>
            <div class="field"><span class="label">Price:</span><span class="value">150.25</span></div>
            <div class="field"><span class="label">Stop Loss:</span><span class="value">148.50</span></div>
            <div class="field"><span class="label">Comment:</span><span class="value">ST_Buy</span></div>
            <div class="field"><span class="label">Time:</span><span class="value">2026-05-17T02:24:05+03:00</span></div>
        </div>
        
        <h2>Sample Sell Signal Payload</h2>
        <div class="payload">
            <div class="field"><span class="label">Side:</span><span class="value">sell</span></div>
            <div class="field"><span class="label">Symbol:</span><span class="value">BTCUSDT</span></div>
            <div class="field"><span class="label">Price:</span><span class="value">65432.10</span></div>
            <div class="field"><span class="label">Stop Loss:</span><span class="value">66000.00</span></div>
            <div class="field"><span class="label">Comment:</span><span class="value">ST_Sell</span></div>
            <div class="field"><span class="label">Time:</span><span class="value">2026-05-17T02:24:05+03:00</span></div>
        </div>
        
        <h2>Sample Close Signal Payload</h2>
        <div class="payload">
            <div class="field"><span class="label">Side:</span><span class="value">close</span></div>
            <div class="field"><span class="label">Symbol:</span><span class="value">EURUSD</span></div>
            <div class="field"><span class="label">Price:</span><span class="value">1.0875</span></div>
            <div class="field"><span class="label">Stop Loss:</span><span class="value">null</span></div>
            <div class="field"><span class="label">Comment:</span><span class="value">ST_Close</span></div>
            <div class="field"><span class="label">Time:</span><span class="value">2026-05-17T02:24:05+03:00</span></div>
        </div>
        
        <h2>How to Test</h2>
        <p>To test the webhook receiver:</p>
        <ol>
            <li>Start a local PHP server: <code>php -S localhost:8000</code> in the webhook directory</li>
            <li>Use curl or Postman to send a POST request to <code>http://localhost:8000/receiver.php</code></li>
            <li>Set Content-Type header to application/json</li>
            <li>Send one of the sample payloads above as JSON in the request body</li>
        </ol>
        
        <h2>Example cURL Command</h2>
        <div class="payload">
            <pre>curl -X POST http://localhost:8000/receiver.php \
  -H "Content-Type: application/json" \
  -d '{
    "side": "buy",
    "symbol": "AAPL",
    "price": "150.25",
    "sl": 148.50,
    "comment": "ST_Buy",
    "time": "2026-05-17T02:24:05+03:00"
  }'</pre>
        </div>
    </div>
</body>
</html>