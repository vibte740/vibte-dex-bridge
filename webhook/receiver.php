<?php
header('Content-Type: application/json');

// Enable CORS for testing (adjust as needed for production)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit();
}

// Get the raw POST data
$rawData = file_get_contents('php://input');

// Check if we received data
if (empty($rawData)) {
    http_response_code(400);
    echo json_encode(['error' => 'No data received']);
    exit();
}

// Try to decode JSON
$data = json_decode($rawData, true);

// Check if JSON is valid
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON received', 'raw_data' => $rawData]);
    exit();
}

// Log the received data (optional)
error_log("Received webhook data: " . print_r($data, true));

// Return the received data back to sender
http_response_code(200);
echo json_encode([
    'status' => 'success',
    'message' => 'Webhook received successfully',
    'received_data' => $data,
    'timestamp' => date('Y-m-d H:i:s')
]);
?>