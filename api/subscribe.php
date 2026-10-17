<?php
/*
 * Email capture for LearnwithStanley Calculators.
 * Receives { email, tool } from the access form and adds the email to a Sender group.
 * The Sender API token stays on the server in config.php, never in the browser.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond($status, $data) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['ok' => false, 'error' => 'Method not allowed']);

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) respond(500, ['ok' => false, 'error' => 'Not configured']);
$config = require $configFile;

$raw = file_get_contents('php://input');
$in = json_decode($raw, true);
if (!is_array($in)) $in = $_POST;

// Honeypot: real people never fill the hidden "website" field.
if (!empty($in['website'])) respond(200, ['ok' => true]);

$email = strtolower(trim((string)($in['email'] ?? '')));
if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, ['ok' => false, 'error' => 'Please enter a valid email address.']);
}

function sender_request($config, $method, $path, $body = null) {
    $ch = curl_init(rtrim($config['api_base'], '/') . $path);
    $headers = [
        'Authorization: Bearer ' . $config['api_token'],
        'Accept: application/json',
        'Content-Type: application/json',
    ];
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $res = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return [$status, json_decode((string)$res, true)];
}

// Find (or create once) the group, caching its id next to this file.
function group_id($config) {
    if (!empty($config['group_id'])) return $config['group_id'];
    $cache = __DIR__ . '/.group-id';
    if (is_file($cache) && ($id = trim(file_get_contents($cache))) !== '') return $id;

    $title = $config['group_title'];
    for ($page = 1; $page <= 20; $page++) {
        [$status, $res] = sender_request($config, 'GET', '/groups?page=' . $page);
        if ($status !== 200 || empty($res['data'])) break;
        foreach ($res['data'] as $g) {
            if (strcasecmp(trim($g['title'] ?? ''), $title) === 0) {
                @file_put_contents($cache, $g['id']);
                return $g['id'];
            }
        }
        if (empty($res['links']['next'])) break;
    }
    [$status, $res] = sender_request($config, 'POST', '/groups', ['title' => $title]);
    $id = $res['data']['id'] ?? null;
    if ($id) @file_put_contents($cache, $id);
    return $id;
}

$gid = group_id($config);
if (!$gid) respond(502, ['ok' => false, 'error' => 'Could not reach the mailing list.']);

// Add (or update) the subscriber in the group. If they already exist, add them to the group.
[$status] = sender_request($config, 'POST', '/subscribers', [
    'email' => $email,
    'groups' => [$gid],
    'trigger_automation' => true,
]);
if ($status < 200 || $status >= 300) {
    [$status] = sender_request($config, 'POST', '/subscribers/groups/' . rawurlencode($gid), [
        'subscribers' => [$email],
        'trigger_automation' => true,
    ]);
}
if ($status < 200 || $status >= 300) respond(502, ['ok' => false, 'error' => 'Could not reach the mailing list.']);

respond(200, ['ok' => true]);
