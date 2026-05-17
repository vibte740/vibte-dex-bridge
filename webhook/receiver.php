<?php
header('Content-Type: application/json');

// Enable CORS for testing (adjust as needed for production)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Preflight request handled']);
    exit();
}

// Capture request details for audit logging
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];
$requestHeaders = getallheaders();
$requestBody = file_get_contents('php://input');

// Initialize response variables
$responseStatus = 200;
$responseBody = ['status' => 'error', 'message' => 'Unknown error'];
$skipProcessing = false;

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $responseStatus = 405;
    $responseBody = ['error' => 'Method not allowed. Use POST.'];
    $skipProcessing = true;
}

// Get the raw POST data (already captured in $requestBody)
// Check if we received data
if (empty($requestBody) && !$skipProcessing) {
    $responseStatus = 400;
    $responseBody = ['error' => 'No data received'];
    $skipProcessing = true;
}

// Try to decode JSON
$data = null;
if (!$skipProcessing) {
    $data = json_decode($requestBody, true);
    
    // Check if JSON is valid
    if (json_last_error() !== JSON_ERROR_NONE) {
        $responseStatus = 400;
        $responseBody = ['error' => 'Invalid JSON received', 'raw_data' => $requestBody];
        $skipProcessing = true;
    }
}

// Log the received data (optional)
if ($data !== null && !$skipProcessing) {
    error_log("Received webhook data: " . print_r($data, true));
}

// Return the received data back to sender (if no error)
if (!$skipProcessing) {
    $responseStatus = 200;
    $responseBody = [
        'status' => 'success',
        'message' => 'Webhook received successfully',
        'received_data' => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ];
}

// Store webhook data in Supabase tradingview_webhooks table
function storeWebhookInSupabase($data) {
    $supabaseUrl = getenv('SUPABASE_URL');
    $supabaseKey = getenv('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!$supabaseUrl || !$supabaseKey) {
        error_log('Supabase credentials not set. Skipping webhook storage.');
        return false;
    }
    
    if (!is_array($data)) {
        error_log('Invalid data format for webhook storage.');
        return false;
    }
    
    // Extract required fields with defaults
    $side = isset($data['side']) && in_array($data['side'], ['buy', 'sell', 'close']) ? $data['side'] : null;
    $symbol = isset($data['symbol']) ? trim($data['symbol']) : null;
    $price = isset($data['price']) ? floatval($data['price']) : null;
    $stopLoss = isset($data['sl']) ? floatval($data['sl']) : null;
    $comment = isset($data['comment']) ? trim($data['comment']) : null;
    
    // Validate required fields
    if ($side === null || $symbol === null || $price === null) {
        error_log('Missing required webhook fields: side, symbol, or price');
        return false;
    }
    
    $url = $supabaseUrl . '/rest/v1/tradingview_webhooks';
    $insertData = json_encode([
        'side' => $side,
        'symbol' => $symbol,
        'price' => $price,
        'stop_loss' => $stopLoss,
        'comment' => $comment,
        'raw_payload' => $data, // Store the entire payload
        'status' => 'pending' // Default status as per table definition
    ]);
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $insertData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json',
        'Prefer: return=representation'
    ]);
    
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        error_log('Supabase webhook storage failed: ' . curl_error($ch));
        curl_close($ch);
        return false;
    }
    
    curl_close($ch);
    
    // Success if we get 201 Created
    return $httpCode === 201;
}

// Store to Supabase if we have valid data
if ($data !== null && !$skipProcessing) {
    storeWebhookInSupabase($data);
}

// Output response
http_response_code($responseStatus);
echo json_encode($responseBody);
?>