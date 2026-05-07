$port = if ($env:PORT) { $env:PORT } else { "3460" }
$root = $PSScriptRoot
if (-not $root) { $root = Split-Path -Parent $MyInvocation.MyCommand.Path }

# Backup folder
$backupFolder = Join-Path (Split-Path -Parent (Split-Path -Parent $root)) "אחסון"
if (-not (Test-Path $backupFolder)) { New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null }

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:${port}/")
$listener.Start()
Write-Host "Studio OS Pro server started on http://localhost:${port}"
Write-Host "Serving files from: $root"
Write-Host "Saving backups to: $backupFolder"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = $request.Url.LocalPath

    # Handle API: POST /api/save → save to disk
    if ($request.HttpMethod -eq 'POST' -and $path -eq '/api/save') {
        try {
            $body = (New-Object System.IO.StreamReader($request.InputStream)).ReadToEnd()
            $data = $body | ConvertFrom-Json

            # Save to "latest" file (always current)
            $latestPath = Join-Path $backupFolder "studio-latest.json"
            [System.IO.File]::WriteAllText($latestPath, $body, [System.Text.Encoding]::UTF8)

            # Also save dated backup at midnight
            $today = (Get-Date -Format 'yyyy-MM-dd')
            $dailyPath = Join-Path $backupFolder "studio-backup-${today}.json"
            if (-not (Test-Path $dailyPath)) {
                [System.IO.File]::WriteAllText($dailyPath, $body, [System.Text.Encoding]::UTF8)
            }

            $response.StatusCode = 200
            $response.ContentType = 'application/json'
            $msg = [System.Text.Encoding]::UTF8.GetBytes('{"status":"saved"}')
            $response.OutputStream.Write($msg, 0, $msg.Length)
        } catch {
            $response.StatusCode = 500
            $msg = [System.Text.Encoding]::UTF8.GetBytes("{`"error`":`"$_`"}")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.Close()
        continue
    }

    # Handle file serving
    if ($path -eq '/') { $path = '/index.html' }

    $filePath = Join-Path $root $path.TrimStart('/')

    if (Test-Path $filePath) {
        $content = [System.IO.File]::ReadAllBytes($filePath)
        $ext = [System.IO.Path]::GetExtension($filePath)
        $contentType = switch ($ext) {
            '.html' { 'text/html; charset=utf-8' }
            '.css'  { 'text/css; charset=utf-8' }
            '.js'   { 'application/javascript; charset=utf-8' }
            '.json' { 'application/json; charset=utf-8' }
            default { 'application/octet-stream' }
        }
        $response.ContentType = $contentType
        $response.ContentLength64 = $content.Length
        $response.OutputStream.Write($content, 0, $content.Length)
    } else {
        $response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
        $response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $response.Close()
}
