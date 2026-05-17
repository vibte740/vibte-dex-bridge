# Webhook Receiver for TradingView Strategies

This directory contains a PHP webhook receiver designed to accept JSON payloads from TradingView Pine Script strategies.

## Files

1. `receiver.php` - Main webhook endpoint that accepts POST requests with JSON payloads
2. `test.php` - Test page showing sample payloads and testing instructions

## Payload Format

The webhook expects JSON payloads in this format:

### Buy Signal
```json
{
  "side": "buy",
  "symbol": "AAPL",
  "price": "150.25",
  "sl": 148.50,
  "comment": "ST_Buy",
  "time": "2026-05-17T02:24:05+03:00"
}
```

### Sell Signal
```json
{
  "side": "sell",
  "symbol": "BTCUSDT",
  "price": "65432.10",
  "sl": 66000.00,
  "comment": "ST_Sell",
  "time": "2026-05-17T02:24:05+03:00"
}
```

### Close Signal
```json
{
  "side": "close",
  "symbol": "EURUSD",
  "price": "1.0875",
  "sl": null,
  "comment": "ST_Close",
  "time": "2026-05-17T02:24:05+03:00"
}
```

## Setup Instructions

### 1. Deploy the Webhook
- Upload the `webhook` directory to your PHP-enabled web server
- Ensure the server has PHP 7.0 or higher installed
- Make sure the `receiver.php` file is accessible via HTTP/HTTPS

### 2. Configure TradingView Alerts
1. Add your strategy to a TradingView chart
2. Click the "Alert" button (clock icon) in the toolbar
3. Set Condition to your strategy name
4. Set "Any alert() function call" as the trigger
5. Under Notifications, paste your webhook URL (e.g., `https://yourdomain.com/webhook/receiver.php`)
6. Save the alert

### 3. Testing the Webhook

#### Using the Test Page
1. Start a local PHP server in the webhook directory:
   ```bash
   php -S localhost:8000
   ```
2. Open your browser to `http://localhost:8000/test.php`
3. Follow the instructions on the page to test with cURL or Postman

#### Using cURL Directly
```bash
# Test buy signal
curl -X POST http://localhost:8000/receiver.php \
  -H "Content-Type: application/json" \
  -d '{
    "side": "buy",
    "symbol": "AAPL",
    "price": "150.25",
    "sl": 148.50,
    "comment": "ST_Buy",
    "time": "2026-05-17T02:24:05+03:00"
  }'
```

## Response Format

The webhook returns a JSON response with:
- `status`: "success" or "error"
- `message": Descriptive message
- `received_data": The parsed JSON payload (on success)
- `timestamp": Server timestamp of receipt

## Security Considerations

For production use, consider adding:
1. IP whitelisting (only allow TradingView IPs)
2. Authentication tokens or signatures
3. Rate limiting
4. HTTPS enforcement
5. Input validation and sanitization

## Troubleshooting

- **405 Method Not Allowed**: Ensure you're sending a POST request
- **400 Bad Request**: Check that your JSON is valid
- **Empty Response**: Verify the webhook URL is correct and accessible
- **CORS Issues**: Adjust the CORS headers in receiver.php as needed

## Customization

You can modify `receiver.php` to:
- Process the data further (e.g., store in database, trigger other actions)
- Add logging or monitoring
- Implement custom validation rules
- Forward to other systems or APIs