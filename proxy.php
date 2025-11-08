<?php
// Increase memory/time to accommodate large transaction payloads during the challenge
@ini_set('memory_limit', '256M');
@set_time_limit(120);
// proxy.php — Minimal PHP proxy to Expensify API
// Purpose: Avoid CORS and keep partner credentials server-side.
// Note: Do not expose this file publicly after review; rotate any credentials if reused.

header('Content-Type: application/json');
// CORS headers intentionally omitted for same-origin usage.
// We'll also enforce origin checks below if an Origin/Referer is provided.

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    header('Cache-Control: no-store');
    exit;
}

// Basic guard: Only POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// Prefer secure endpoint; fallback is legacy same path
$EXPENSIFY_API_URL = 'https://www.expensify.com/api';
// Load partner credentials from environment variables for security.
// Configure these in your hosting platform (e.g., Render) as environment variables:
//   PARTNER_NAME=applicant
//   PARTNER_PASSWORD=...secret...
// For local development, you may set them in your shell before starting PHP.
// As a last resort (not recommended), you can hardcode fallback values here.
$PARTNER_NAME = getenv('PARTNER_NAME') ?: 'applicant';
$PARTNER_PASSWORD = getenv('PARTNER_PASSWORD') ?: '';
if ($PARTNER_PASSWORD === '') {
    // Fail fast if secret missing; prevents accidental public deployments with blank password
    http_response_code(500);
    header('Cache-Control: no-store');
    echo json_encode(['error' => 'Server misconfiguration: PARTNER_PASSWORD not set']);
    exit;
}

// Same-origin enforcement: if Origin header is present, require host to match
$originOk = true;
if (!empty($_SERVER['HTTP_ORIGIN'])) {
    $originHost = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST);
    $host = $_SERVER['HTTP_HOST'];
    // strip port from HTTP_HOST if present
    $hostOnly = preg_replace('/:.*/', '', $host);
    if (!empty($originHost) && strcasecmp($originHost, $hostOnly) !== 0) {
        $originOk = false;
    }
}
// As a fallback, check Referer host if Origin not sent
if ($originOk && empty($_SERVER['HTTP_ORIGIN']) && !empty($_SERVER['HTTP_REFERER'])) {
    $refHost = parse_url($_SERVER['HTTP_REFERER'], PHP_URL_HOST);
    $host = $_SERVER['HTTP_HOST'];
    $hostOnly = preg_replace('/:.*/', '', $host);
    if (!empty($refHost) && strcasecmp($refHost, $hostOnly) !== 0) {
        $originOk = false;
    }
}
if (!$originOk) {
    http_response_code(403);
    header('Cache-Control: no-store');
    echo json_encode(['error' => 'Forbidden: cross-origin requests are not allowed']);
    exit;
}

// Accept both JSON and form-encoded input
$raw = file_get_contents('php://input');
$input = [];
if ($raw) {
    $decoded = json_decode($raw, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
        $input = $decoded;
    }
}
if (!$input) {
    $input = $_POST;
}

$command = $input['command'] ?? null;
$params  = $input['params'] ?? [];

if (!$command || !is_array($params)) {
    http_response_code(400);
    header('Cache-Control: no-store');
    echo json_encode(['error' => 'Invalid request: missing command or params']);
    exit;
}

// Whitelist allowed commands for this challenge
$allowedCommands = ['Authenticate', 'Get', 'CreateTransaction'];
if (!in_array($command, $allowedCommands, true)) {
    http_response_code(400);
    header('Cache-Control: no-store');
    echo json_encode(['error' => 'Invalid command']);
    exit;
}

// Always attach partner credentials server-side
$params['partnerName'] = $PARTNER_NAME;
$params['partnerPassword'] = $PARTNER_PASSWORD;

// Build POST body as application/x-www-form-urlencoded as expected by Expensify legacy API
// Ensure booleans/numbers handled correctly and not double-encoded
$postFields = http_build_query(array_merge(['command' => $command], $params), '', '&', PHP_QUERY_RFC3986);

$ch = curl_init($EXPENSIFY_API_URL);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $postFields,
    CURLOPT_HTTPHEADER => [
        // Required custom header for this challenge
        'expensifyengineeringcandidate: 1',
        'Content-Type: application/x-www-form-urlencoded',
        'Accept: application/json'
    ],
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_ENCODING => '', // accept gzip/deflate
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
]);

$resp = curl_exec($ch);
$errNo = curl_errno($ch);
$err   = curl_error($ch);
$code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

if ($errNo) {
    http_response_code(502);
    header('Cache-Control: no-store');
    echo json_encode([
        'error' => 'Upstream error',
        'detail' => $err,
        'status' => $code,
        'command' => $command
    ]);
    exit;
}

// Pass-through upstream response body directly to avoid large memory use from decode/encode
http_response_code($code ?: 200);
// Ensure JSON content type (Expensify API returns JSON)
header('Content-Type: application/json');
header('Cache-Control: no-store');
echo $resp !== false ? $resp : json_encode(['error' => 'Empty upstream response', 'status' => $code, 'command' => $command]);
exit;
