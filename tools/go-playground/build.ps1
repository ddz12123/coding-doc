# Build script for the Go playground WASM runner.
# Usage:   powershell -File tools/go-playground/build.ps1
# Output:  static/go-wasm/main.wasm + wasm_exec.js (matched to current Go version)
# NOTE: keep this file ASCII-only. Windows PowerShell 5.1 parses BOM-less
#       UTF-8 scripts as GBK and breaks on non-ASCII characters.
$ErrorActionPreference = 'Stop'

$srcDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path $srcDir '..\..\static\go-wasm'
New-Item -ItemType Directory -Force $outDir | Out-Null

Push-Location $srcDir
try {
    # 1. Compile to WASM. "-s -w" strips debug info (~40% smaller).
    #    CGO must be disabled explicitly: if the global go env has
    #    CGO_ENABLED=1, cross-compiling to js/wasm fails in os/user etc.
    $env:CGO_ENABLED = '0'
    $env:GOOS = 'js'
    $env:GOARCH = 'wasm'
    go build -trimpath -ldflags '-s -w' -o (Join-Path $outDir 'main.wasm') .
    if ($LASTEXITCODE -ne 0) { throw "go build failed (exit code $LASTEXITCODE)" }
    $env:CGO_ENABLED = ''
    $env:GOOS = ''
    $env:GOARCH = ''

    # 2. Gzip the wasm. EdgeOne Pages rejects single files over 25MiB,
    #    so only main.wasm.gz is committed/deployed; go-worker.js
    #    decompresses it in the browser via DecompressionStream.
    $wasmPath = Join-Path $outDir 'main.wasm'
    $gzPath = "$wasmPath.gz"
    $in = [System.IO.File]::OpenRead($wasmPath)
    $out = [System.IO.File]::Create($gzPath)
    $gz = New-Object System.IO.Compression.GzipStream($out, [System.IO.Compression.CompressionLevel]::Optimal)
    $in.CopyTo($gz)
    $gz.Dispose(); $out.Dispose(); $in.Dispose()

    # 3. Copy the official JS glue script. It MUST match the Go version
    #    used for compilation above.
    $goroot = go env GOROOT
    $glue = Join-Path $goroot 'lib\wasm\wasm_exec.js'      # Go 1.24+
    if (-not (Test-Path $glue)) {
        $glue = Join-Path $goroot 'misc\wasm\wasm_exec.js' # older Go
    }
    Copy-Item $glue $outDir -Force

    Write-Host "`n== Build OK ==" -ForegroundColor Green
    Get-ChildItem $outDir | Format-Table Name, @{N = 'Size(MB)'; E = { [math]::Round($_.Length / 1MB, 2) } }
}
finally {
    Pop-Location
}
