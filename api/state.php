<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function requireString(array $record, string $key, int $maxLength): string
{
    $value = $record[$key] ?? null;
    if (!is_string($value) || trim($value) === '' || strlen($value) > $maxLength) {
        throw new InvalidArgumentException("Invalid or missing {$key}.");
    }

    return $value;
}

function requireAmount(array $record, string $key, float $minimum = 0): float
{
    $value = $record[$key] ?? null;
    if (!is_numeric($value) || !is_finite((float) $value) || (float) $value < $minimum || (float) $value > 999999999.99) {
        throw new InvalidArgumentException("Invalid or missing {$key}.");
    }

    return (float) $value;
}

function requireDate(array $record, string $key): void
{
    $value = $record[$key] ?? null;
    $date = is_string($value) ? DateTimeImmutable::createFromFormat('!Y-m-d', $value) : false;
    if (!$date || $date->format('Y-m-d') !== $value) {
        throw new InvalidArgumentException("Invalid or missing {$key}.");
    }
}

function validateRecords(mixed $records, string $type): void
{
    if (!is_array($records) || count($records) > 50000) {
        throw new InvalidArgumentException("Invalid {$type} records.");
    }

    $ids = [];
    foreach ($records as $record) {
        if (!is_array($record)) {
            throw new InvalidArgumentException("Invalid {$type} record.");
        }
        $id = requireString($record, 'id', 40);
        if (isset($ids[$id])) {
            throw new InvalidArgumentException("Duplicate {$type} ID.");
        }
        $ids[$id] = true;

        switch ($type) {
            case 'members':
                requireString($record, 'name', 240);
                requireString($record, 'course', 80);
                requireString($record, 'year', 80);
                requireString($record, 'contact', 40);
                requireAmount($record, 'fee');
                break;
            case 'assessments':
                requireString($record, 'memberId', 40);
                requireAmount($record, 'amount', 0.01);
                requireDate($record, 'date');
                break;
            case 'collections':
                requireString($record, 'memberId', 40);
                requireAmount($record, 'amount', 0.01);
                requireDate($record, 'date');
                requireString($record, 'receipt', 80);
                if (!in_array($record['method'] ?? null, ['Cash', 'GCash', 'Bank transfer'], true)) {
                    throw new InvalidArgumentException('Invalid collection method.');
                }
                break;
            case 'expenses':
                requireString($record, 'description', 240);
                requireString($record, 'recordedBy', 160);
                requireAmount($record, 'amount', 0.01);
                requireDate($record, 'date');
                if (!in_array($record['category'] ?? null, ['Events', 'Supplies', 'Transportation', 'Food', 'Other'], true)) {
                    throw new InvalidArgumentException('Invalid expense category.');
                }
                validateDocument($record['document'] ?? null);
                break;
            case 'advances':
                requireString($record, 'purpose', 240);
                requireAmount($record, 'amount', 0.01);
                requireAmount($record, 'actualExpenses');
                requireAmount($record, 'returned');
                requireDate($record, 'date');
                if (round((float) $record['actualExpenses'] + (float) $record['returned'], 2) > (float) $record['amount']) {
                    throw new InvalidArgumentException('Advance expenses and returned cash cannot exceed the advance.');
                }
                break;
        }
    }
}

function validateDocument(mixed $document): void
{
    if ($document === null) {
        return;
    }
    if (!is_array($document)) {
        throw new InvalidArgumentException('Invalid expense attachment.');
    }

    $name = requireString($document, 'name', 255);
    $type = requireString($document, 'type', 80);
    $data = $document['data'] ?? null;
    $prefixes = [
        'application/pdf' => 'data:application/pdf;base64,',
        'image/jpeg' => 'data:image/jpeg;base64,',
        'image/png' => 'data:image/png;base64,',
        'image/webp' => 'data:image/webp;base64,',
    ];
    if (strlen($name) > 255 || !isset($prefixes[$type]) || !is_string($data) || strlen($data) > 3 * 1024 * 1024 || !str_starts_with($data, $prefixes[$type])) {
        throw new InvalidArgumentException('Invalid expense attachment.');
    }
}

try {
    $configPath = __DIR__ . '/config.php';
    if (!is_file($configPath)) {
        respond(500, ['error' => 'Missing api/config.php. Copy api/config.example.php and configure the MySQL connection.']);
    }

    $config = require $configPath;
    $pdo = new PDO($config['dsn'], $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $row = $pdo->query('SELECT payload, version FROM ledgerly_state WHERE id = 1')->fetch();
        if (!$row) {
            respond(200, ['state' => null, 'version' => 0]);
        }
        respond(200, ['state' => json_decode($row['payload'], true, 512, JSON_THROW_ON_ERROR), 'version' => (int) $row['version']]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
        header('Allow: GET, PUT');
        respond(405, ['error' => 'Method not allowed.']);
    }

    $rawBody = file_get_contents('php://input');
    if ($rawBody === false || strlen($rawBody) > 8 * 1024 * 1024) {
        respond(413, ['error' => 'Request body is too large.']);
    }
    $input = json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($input) || !isset($input['version']) || !is_int($input['version']) || $input['version'] < 0 || !is_array($input['state'])) {
        respond(400, ['error' => 'Expected a state object and non-negative version.']);
    }

    $state = $input['state'];
    foreach (['members', 'assessments', 'collections', 'expenses', 'advances'] as $type) {
        validateRecords($state[$type] ?? null, $type);
    }
    requireString($state, 'organization', 240);
    requireAmount($state, 'defaultFee');
    $payload = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

    $pdo->beginTransaction();
    $row = $pdo->query('SELECT version FROM ledgerly_state WHERE id = 1 FOR UPDATE')->fetch();
    if (!$row && $input['version'] !== 0 || $row && (int) $row['version'] !== $input['version']) {
        $pdo->rollBack();
        respond(409, ['error' => 'The saved data changed in another session.']);
    }

    if ($row) {
        $statement = $pdo->prepare('UPDATE ledgerly_state SET payload = ?, version = version + 1 WHERE id = 1');
        $statement->execute([$payload]);
        $nextVersion = (int) $row['version'] + 1;
    } else {
        $statement = $pdo->prepare('INSERT INTO ledgerly_state (id, payload, version) VALUES (1, ?, 1)');
        $statement->execute([$payload]);
        $nextVersion = 1;
    }
    $pdo->commit();
    respond(200, ['version' => $nextVersion]);
} catch (InvalidArgumentException $error) {
    respond(422, ['error' => $error->getMessage()]);
} catch (JsonException $error) {
    respond(400, ['error' => 'Invalid JSON request or database data.']);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Ledgerly API error: ' . $error->getMessage());
    respond(500, ['error' => 'The database request failed. Check the PHP server log and database setup.']);
}
