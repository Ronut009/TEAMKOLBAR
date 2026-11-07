# Tiny local web server for Rakti, used when Python is not installed. Needs nothing but Windows' built-in PowerShell.
param([int]$Port = 8124, [string]$Root = $PSScriptRoot)
$ErrorActionPreference = 'Continue'
$Root = (Resolve-Path -LiteralPath $Root).Path.TrimEnd('\')
$mime = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8'
  '.css'='text/css; charset=utf-8'; '.json'='application/json'; '.txt'='text/plain; charset=utf-8'; '.md'='text/plain; charset=utf-8'
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.gif'='image/gif'; '.webp'='image/webp'; '.svg'='image/svg+xml'; '.ico'='image/x-icon'
  '.mp3'='audio/mpeg'; '.wav'='audio/wav'; '.ogg'='audio/ogg'; '.mp4'='video/mp4'; '.webm'='video/webm'
  '.woff'='font/woff'; '.woff2'='font/woff2'; '.ttf'='font/ttf'
}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
try { $listener.Start() } catch {
  Write-Host "Could not start the game server on port $Port (is it already running?)." -ForegroundColor Red
  Write-Host $_.Exception.Message
  Read-Host 'Press Enter to close'
  exit 1
}
Write-Host "Rakti server running at http://127.0.0.1:$Port/  (close this window to stop it)"
$chunk = 1MB
$buf = New-Object byte[] 65536
while ($listener.IsListening) {
  try { $ctx = $listener.GetContext() } catch { break }
  $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/').Replace('/', '\')
    if ($rel -eq '') { $rel = 'index.html' }
    $path = [System.IO.Path]::GetFullPath((Join-Path $Root $rel))
    if (Test-Path -LiteralPath $path -PathType Container) { $path = Join-Path $path 'index.html' }
    if (-not $path.StartsWith($Root + '\', [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $path -PathType Leaf)) {
      $res.StatusCode = 404; $res.Close(); continue
    }
    $ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
    $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
    $res.Headers['Cache-Control'] = 'no-cache'
    $res.Headers['Accept-Ranges'] = 'bytes'
    $fs = [System.IO.File]::Open($path, 'Open', 'Read', 'ReadWrite')
    try {
      $len = $fs.Length; $start = 0; $end = $len - 1
      $rng = $ctx.Request.Headers['Range']
      if ($rng -and $rng -match '^bytes=(\d*)-(\d*)$') {
        if ($Matches[1] -ne '') { $start = [long]$Matches[1] }
        if ($Matches[2] -ne '') { $end = [long]$Matches[2] }
        if ($Matches[1] -eq '' -and $Matches[2] -ne '') { $start = [Math]::Max(0, $len - [long]$Matches[2]); $end = $len - 1 }
        if ($end -gt $len - 1) { $end = $len - 1 }
        if ($end - $start + 1 -gt $chunk) { $end = $start + $chunk - 1 }   # short chunks keep this one-at-a-time server from stalling
        if ($start -gt $end) { $res.StatusCode = 416; $res.Headers['Content-Range'] = "bytes */$len"; $res.Close(); continue }
        $res.StatusCode = 206
        $res.Headers['Content-Range'] = "bytes $start-$end/$len"
      }
      $count = $end - $start + 1
      $res.ContentLength64 = $count
      $fs.Seek($start, 'Begin') | Out-Null
      while ($count -gt 0) {
        $n = $fs.Read($buf, 0, [int][Math]::Min($buf.Length, $count))
        if ($n -le 0) { break }
        $res.OutputStream.Write($buf, 0, $n)
        $count -= $n
      }
    } finally { $fs.Close() }
    $res.Close()
  } catch {
    try { $res.Abort() } catch {}   # the browser closed the connection early: harmless
  }
}
