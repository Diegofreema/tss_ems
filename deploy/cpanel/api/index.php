<?php
/**
 * TSS EMS — reverse proxy for the school's API.
 *
 * WHY THIS FILE EXISTS
 * The school's API sends no Access-Control-Allow-Origin header, so a browser
 * is not permitted to call it directly from the portal's origin. The app is
 * built on that fact: `src/api/client.ts` always calls its OWN origin at /api
 * and something server-side forwards it. In development that is Vite's proxy;
 * on Vercel it is the rewrite in vercel.json; here it is this file.
 *
 * Apache's own mod_proxy would be faster, but it is disabled on most shared
 * cPanel plans and SSLProxyEngine cannot be set from .htaccess. PHP is always
 * available, so this is the option that actually works everywhere.
 *
 * This is NOT an open proxy: the upstream host is fixed below and only the
 * path after /api is taken from the request.
 */

declare(strict_types=1);

/*
 * A PHP notice or deprecation printed into the body would corrupt the JSON
 * envelope the client is about to parse — which is exactly what happened in
 * testing on PHP 8.5. Errors go to the log, never to the response.
 */
ini_set('display_errors', '0');
error_reporting(E_ALL);

// ---------------------------------------------------------------------------
// CONFIGURATION — the only line you normally need to change.
// No trailing slash.
// ---------------------------------------------------------------------------
$UPSTREAM = getenv('NETPRO_API_UPSTREAM') ?: 'https://portal.tss.sch.ng/backend/api';

// Must comfortably exceed the client's own 30s bound in src/api/client.ts,
// or the proxy gives up first and the app reports the wrong reason.
$TIMEOUT = 45;

// ---------------------------------------------------------------------------

/** Answer in the app's own envelope, so the client's error handling works. */
// No `: never` return type — that needs PHP 8.1, and this has to run on
// whatever the host is set to.
function fail(int $status, string $message) {
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode(['success' => false, 'message' => $message, 'data' => null]);
    exit;
}

if (!function_exists('curl_init')) {
    fail(500, 'This server cannot reach the school system. Ask your host to enable the PHP cURL extension.');
}

// --- Work out the upstream path --------------------------------------------
// REQUEST_URI is the ORIGINAL path, before .htaccess rewrote it here.
$requestUri = $_SERVER['REQUEST_URI'] ?? '/api';
$path = parse_url($requestUri, PHP_URL_PATH) ?? '/api';

// Strip the leading /api. Everything after it belongs to the school.
$path = preg_replace('#^/api#', '', $path) ?? '';

// Refuse anything that tries to climb out of the upstream's own path.
if (str_contains($path, '..') || str_contains($path, '://') || str_contains($path, '\\')) {
    fail(400, 'That address is not valid.');
}

$query = $_SERVER['QUERY_STRING'] ?? '';
$target = $UPSTREAM . $path . ($query !== '' ? '?' . $query : '');

// --- Headers to forward -----------------------------------------------------
// Deliberately narrow. Host, Connection, Content-Length and the cookies of
// this origin have no business upstream; cURL sets what it needs itself.
$forward = [];
$headers = function_exists('getallheaders') ? getallheaders() : [];
foreach ($headers as $name => $value) {
    $lower = strtolower((string) $name);
    if (in_array($lower, ['authorization', 'accept', 'content-type', 'accept-language', 'x-requested-with'], true)) {
        $forward[] = $name . ': ' . $value;
    }
}
// Some PHP/FastCGI setups drop Authorization before getallheaders() sees it.
if (!array_filter($forward, fn($h) => stripos($h, 'authorization:') === 0)) {
    $auth = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? null;
    if ($auth) $forward[] = 'Authorization: ' . $auth;
}

/*
 * Two headers the browser always sends and cURL does not. Measured: without
 * them the school's host answered 406 Not Acceptable from ModSecurity, which
 * reads a header-less request as a bot. The app itself always sends Accept,
 * so this only fills in what the proxy would otherwise have dropped.
 */
if (!array_filter($forward, fn($h) => stripos($h, 'accept:') === 0)) {
    $forward[] = 'Accept: application/json';
}
/*
 * A FIXED User-Agent, deliberately not the caller's.
 *
 * Measured against the school's host: it runs ModSecurity with a blocklist of
 * tool user-agents, so forwarding a `curl/8.7.1` (or sending none at all)
 * comes back 406 Not Acceptable, while an ordinary identifiable string gets
 * the real 401 envelope. Forwarding the end user's own agent would also hand
 * the upstream their browser and operating system for no reason.
 */
$forward[] = 'User-Agent: Mozilla/5.0 (compatible; NETPRO-EMS-Proxy/1.0)';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// --- Body -------------------------------------------------------------------
$body = null;
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';

if (!in_array($method, ['GET', 'HEAD'], true)) {
    if (stripos($contentType, 'multipart/form-data') === 0) {
        /*
         * PHP has already consumed and parsed the multipart body, so
         * php://input is empty. Rebuild it from $_POST and $_FILES and let
         * cURL write a fresh boundary — which is why the original
         * Content-Type must be dropped here rather than forwarded.
         */
        $forward = array_values(array_filter(
            $forward,
            fn($h) => stripos($h, 'content-type:') !== 0
        ));

        $body = [];
        $flatten = function (string $key, $value) use (&$flatten, &$body): void {
            if (is_array($value)) {
                foreach ($value as $k => $v) $flatten($key . '[' . $k . ']', $v);
            } else {
                $body[$key] = $value;
            }
        };
        foreach ($_POST as $key => $value) $flatten((string) $key, $value);

        foreach ($_FILES as $key => $file) {
            if (is_array($file['name'])) {
                foreach ($file['name'] as $i => $name) {
                    if (($file['error'][$i] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) continue;
                    $body[$key . '[' . $i . ']'] = new CURLFile(
                        $file['tmp_name'][$i], $file['type'][$i] ?: 'application/octet-stream', $name
                    );
                }
            } elseif (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                $body[$key] = new CURLFile(
                    $file['tmp_name'], $file['type'] ?: 'application/octet-stream', $file['name']
                );
            }
        }
    } else {
        $body = file_get_contents('php://input');
    }
}

// --- Send -------------------------------------------------------------------
$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_HTTPHEADER     => $forward,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER         => true,
    CURLOPT_TIMEOUT        => $TIMEOUT,
    CURLOPT_CONNECTTIMEOUT => 15,
    // Never auto-follow: a 302 from the API is information the client needs.
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_ENCODING       => '',
]);
if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);

$raw = curl_exec($ch);

if ($raw === false) {
    $errno = curl_errno($ch);
    $error = curl_error($ch);
    // 504 where it timed out, 502 otherwise — the client tells them apart.
    $timedOut = in_array($errno, [CURLE_OPERATION_TIMEDOUT, CURLE_COULDNT_CONNECT], true);
    error_log('[netpro-proxy] ' . $errno . ' ' . $error . ' -> ' . $target);
    fail(
        $timedOut ? 504 : 502,
        'The school system could not be reached. Please try again in a moment.'
    );
}

$status     = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
// No curl_close(): a no-op since PHP 8.0 and deprecated in 8.5, where the
// notice it raises is printed into the body and breaks the JSON.

$rawHeaders = substr($raw, 0, $headerSize);
$payload    = substr($raw, $headerSize);

// --- Reply ------------------------------------------------------------------
http_response_code($status);

/*
 * Only headers the client actually reads are passed back.
 *
 * `Date` matters more than it looks: every answer re-anchors the school's
 * clock through noteServerTime(), and an assignment countdown is measured
 * against it. Left alone, the browser would read THIS host's clock instead of
 * the school's. Content-Disposition matters for requestBlob() — the CSV
 * export and the applicant download.
 */
$keep = ['content-type', 'content-disposition', 'date', 'etag', 'last-modified'];
foreach (explode("\r\n", $rawHeaders) as $line) {
    $split = strpos($line, ':');
    if ($split === false) continue;
    $name = strtolower(trim(substr($line, 0, $split)));
    if (in_array($name, $keep, true)) {
        header(trim($line), true);
    }
}

// The API's answers are never cached — the device's own database is the cache.
header('Cache-Control: no-store, no-cache, must-revalidate');

echo $payload;
