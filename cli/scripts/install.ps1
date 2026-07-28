[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$Repo = "apet97/plaky115"
$Version = if ($env:PLAKY115_VERSION) { $env:PLAKY115_VERSION } else { "latest" }
$InstallDir = if ($env:PLAKY115_INSTALL_DIR) { $env:PLAKY115_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "Programs\plaky115" }

if ($Version -eq "latest") {
    $Version = (Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest").tag_name
}
if ($Version -notmatch '^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$') { throw "version must be an exact v<semver> tag" }
$arch = switch ($env:PROCESSOR_ARCHITECTURE) { "AMD64" { "x86_64" } "ARM64" { "arm64" } default { throw "unsupported architecture" } }
$archiveName = "plaky115_Windows_$arch.zip"

if ($env:PLAKY115_INSTALL_TEST_BASE_URL) {
    if ($env:PLAKY115_INSTALL_TESTING -ne "1") { throw "test base URL is disabled" }
    $releaseBase = "$($env:PLAKY115_INSTALL_TEST_BASE_URL.TrimEnd('/'))/$Version"
} else {
    $releaseBase = "https://github.com/$Repo/releases/download/$Version"
}

$tempDir = Join-Path ([IO.Path]::GetTempPath()) "plaky115-install-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $tempDir | Out-Null
$staged = $null
$backup = $null
try {
    $archivePath = Join-Path $tempDir $archiveName
    $checksumsPath = Join-Path $tempDir "checksums.txt"
    Invoke-WebRequest -Uri "$releaseBase/$archiveName" -OutFile $archivePath
    Invoke-WebRequest -Uri "$releaseBase/checksums.txt" -OutFile $checksumsPath

    $matches = @(Get-Content $checksumsPath | ForEach-Object {
        if ($_ -match '^([0-9A-Fa-f]{64})\s+\*?(.+)$' -and $Matches[2] -ceq $archiveName) { $Matches[1] }
    })
    if ($matches.Count -ne 1) { throw "checksums.txt must contain exactly one entry for $archiveName" }
    $actual = (Get-FileHash -Algorithm SHA256 -Path $archivePath).Hash
    if ($actual -ine $matches[0]) { throw "checksum mismatch" }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::OpenRead($archivePath)
    try {
        $root = [IO.Path]::GetFullPath("$tempDir$([IO.Path]::DirectorySeparatorChar)")
        foreach ($entry in $zip.Entries) {
            $destination = [IO.Path]::GetFullPath((Join-Path $tempDir $entry.FullName))
            if (-not $destination.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { throw "archive contains an unsafe path" }
        }
        $binaries = @($zip.Entries | Where-Object { $_.FullName -ceq "plaky115.exe" -and $_.Name -ceq "plaky115.exe" })
        if ($binaries.Count -ne 1) { throw "archive must contain exactly one plaky115.exe binary" }
        $extracted = Join-Path $tempDir "plaky115.exe"
        [IO.Compression.ZipFileExtensions]::ExtractToFile($binaries[0], $extracted, $false)
    } finally { $zip.Dispose() }

    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    $target = Join-Path $InstallDir "plaky115.exe"
    $staged = Join-Path $InstallDir ".plaky115.new.$([guid]::NewGuid())"
    Copy-Item $extracted $staged
    if (Test-Path $target) {
        $backup = Join-Path $InstallDir ".plaky115.backup.$([guid]::NewGuid())"
        Move-Item $target $backup
    }
    try {
        Move-Item $staged $target
        $staged = $null
        if ($backup) { Remove-Item $backup -Force; $backup = $null }
    } catch {
        if ($backup) {
            if (Test-Path $target) { Remove-Item $target -Force }
            Move-Item $backup $target
            $backup = $null
        }
        throw
    }
    Write-Host "plaky115 $Version installed to $target"
} finally {
    if ($staged -and (Test-Path $staged)) { Remove-Item $staged -Force }
    if ($backup -and (Test-Path $backup)) { Remove-Item $backup -Force }
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
}
