[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$Repo = "apet97/plaky115"
$BinaryName = "plaky115"
$Version = if ($env:PLAKY115_VERSION) { $env:PLAKY115_VERSION } else { "latest" }
$InstallDir = if ($env:PLAKY115_INSTALL_DIR) { $env:PLAKY115_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "Programs\plaky115" }
$Testing = $env:PLAKY115_INSTALL_TESTING -eq "1"

$MetadataMaxBytes = 1MB
$ArchiveMaxBytes = 256MB
$MaxEntryBytes = 256MB
$MaxEntries = 32
$MaxRedirects = 5
$ConnectTimeoutSeconds = 10
$TotalTimeoutSeconds = 120

$handler = [Net.Http.SocketsHttpHandler]::new()
$handler.AllowAutoRedirect = $false
$handler.ConnectTimeout = [TimeSpan]::FromSeconds($ConnectTimeoutSeconds)
$script:HttpClient = [Net.Http.HttpClient]::new($handler)
$script:HttpClient.Timeout = [TimeSpan]::FromSeconds($TotalTimeoutSeconds)

function Assert-FileSize([string] $Path, [long] $Maximum) {
    $length = (Get-Item -LiteralPath $Path).Length
    if ($length -gt $Maximum) { throw "download exceeds the size limit" }
}

function Assert-AllowedUrl([Uri] $Uri) {
    if ($Testing -and $Uri.Scheme -eq "file") { return }
    if ($Testing -and $Uri.Scheme -eq "http" -and @("127.0.0.1", "localhost") -contains $Uri.Host) { return }
    $allowedHosts = @("github.com", "api.github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com", "github-releases.githubusercontent.com")
    if ($Uri.Scheme -ne "https" -or $allowedHosts -notcontains $Uri.Host) { throw "download URL is not allowed" }
}

function Copy-BoundedUrl([string] $Url, [string] $Destination, [long] $Maximum) {
    $current = [Uri]$Url
    for ($redirect = 0; $redirect -le $MaxRedirects; $redirect++) {
        Assert-AllowedUrl $current
        if ($current.Scheme -eq "file") {
            Copy-Item -LiteralPath $current.LocalPath -Destination $Destination
            Assert-FileSize $Destination $Maximum
            return
        }
        $request = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Get, $current)
        $response = $null
        try {
            $response = $script:HttpClient.SendAsync($request, [Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
            if ([int]$response.StatusCode -ge 300 -and [int]$response.StatusCode -lt 400) {
                if (-not $response.Headers.Location) { throw "download redirect is missing a location" }
                $next = [Uri]::new($current, $response.Headers.Location)
                $response.Dispose()
                $request.Dispose()
                $current = $next
                continue
            }
            if (-not $response.IsSuccessStatusCode) { throw "download failed" }
            if ($response.Content.Headers.ContentLength -and $response.Content.Headers.ContentLength -gt $Maximum) { throw "download exceeds the size limit" }
            $input = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
            $output = [IO.FileStream]::new($Destination, [IO.FileMode]::Create, [IO.FileAccess]::Write, [IO.FileShare]::None)
            try {
                $buffer = New-Object byte[] 65536
                [long]$total = 0
                while (($read = $input.Read($buffer, 0, $buffer.Length)) -gt 0) {
                    $total += $read
                    if ($total -gt $Maximum) { throw "download exceeds the size limit" }
                    $output.Write($buffer, 0, $read)
                }
            } finally {
                $output.Dispose()
                $input.Dispose()
            }
            Assert-FileSize $Destination $Maximum
            return
        } finally {
            if ($response) { $response.Dispose() }
            $request.Dispose()
        }
    }
    throw "download exceeded redirect limit"
}

if ($Version -eq "latest") {
    $metadata = Join-Path ([IO.Path]::GetTempPath()) "plaky115-release-$([guid]::NewGuid()).json"
    try {
        Copy-BoundedUrl "https://api.github.com/repos/$Repo/releases/latest" $metadata $MetadataMaxBytes
        $Version = (Get-Content -LiteralPath $metadata -Raw | ConvertFrom-Json).tag_name
    } finally {
        if (Test-Path -LiteralPath $metadata) { Remove-Item -LiteralPath $metadata -Force }
    }
}
if ($Version -notmatch '^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$') { throw "version must be an exact v<semver> tag" }
if ($Version -match '-([^+]+)') {
    foreach ($identifier in $Matches[1].Split('.')) {
        if ($identifier -match '^0\d+$') { throw "version must be an exact v<semver> tag" }
    }
}
$arch = switch ($env:PROCESSOR_ARCHITECTURE) { "AMD64" { "x86_64" } "ARM64" { "arm64" } default { throw "unsupported architecture" } }
$archiveName = "plaky115_Windows_$arch.zip"

if ($env:PLAKY115_INSTALL_TEST_BASE_URL) {
    if (-not $Testing) { throw "test base URL is disabled" }
    $base = $env:PLAKY115_INSTALL_TEST_BASE_URL.TrimEnd('/')
    $baseUri = [Uri]$base
    if ($baseUri.Scheme -ne "file" -and -not ($baseUri.Scheme -eq "http" -and @("127.0.0.1", "localhost") -contains $baseUri.Host)) { throw "test base URL is not allowed" }
    $releaseBase = "$base/$Version"
} else {
    $releaseBase = "https://github.com/$Repo/releases/download/$Version"
}

$tempDir = Join-Path ([IO.Path]::GetTempPath()) "plaky115-install-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $tempDir | Out-Null
$staged = $null
$target = $null
$backup = $null
$backupPreserved = $false
try {
    $archivePath = Join-Path $tempDir $archiveName
    $checksumsPath = Join-Path $tempDir "checksums.txt"
    try {
        Copy-BoundedUrl "$releaseBase/$archiveName" $archivePath $ArchiveMaxBytes
        Copy-BoundedUrl "$releaseBase/checksums.txt" $checksumsPath $MetadataMaxBytes
    } catch { throw "download failed" }

    $matches = @(Get-Content -LiteralPath $checksumsPath | ForEach-Object {
        if ($_ -match '^([0-9A-Fa-f]{64})\s+\*?(.+)$' -and $Matches[2] -ceq $archiveName) { $Matches[1] }
    })
    if ($matches.Count -ne 1) { throw "checksums.txt must contain exactly one entry for $archiveName" }
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash
    if ($actual -ine $matches[0]) { throw "checksum mismatch" }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::OpenRead($archivePath)
    try {
        if ($zip.Entries.Count -gt $MaxEntries) { throw "archive contains too many entries" }
        $root = [IO.Path]::GetFullPath("$tempDir$([IO.Path]::DirectorySeparatorChar)")
        $names = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
        foreach ($entry in $zip.Entries) {
            if (-not $names.Add($entry.FullName)) { throw "archive contains duplicate entries" }
            if ([IO.Path]::IsPathRooted($entry.FullName) -or $entry.FullName -match '(^|[\\/])\.\.([\\/]|$)' -or $entry.FullName.Contains('\0')) { throw "archive contains an unsafe path" }
            $destination = [IO.Path]::GetFullPath((Join-Path $tempDir $entry.FullName))
            if (-not $destination.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { throw "archive contains an unsafe path" }
            if ($entry.Length -gt $MaxEntryBytes -or $entry.CompressedLength -gt $MaxEntryBytes) { throw "archive entry exceeds the size limit" }
            if ($entry.FullName.EndsWith("/") -or $entry.Name -eq "") { throw "archive contains a non-regular entry" }
            $unixType = ($entry.ExternalAttributes -shr 16) -band 0xF000
            if ($unixType -eq 0xA000) { throw "archive contains a link entry" }
        }
        $binaries = @($zip.Entries | Where-Object { $_.FullName -ceq "plaky115.exe" -and $_.Name -ceq "plaky115.exe" })
        if ($binaries.Count -ne 1) { throw "archive must contain exactly one plaky115.exe binary" }
        $extracted = Join-Path $tempDir "plaky115.exe"
        [IO.Compression.ZipFileExtensions]::ExtractToFile($binaries[0], $extracted, $false)
        Assert-FileSize $extracted $MaxEntryBytes
    } finally { $zip.Dispose() }

    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    $target = Join-Path $InstallDir "plaky115.exe"
    $staged = Join-Path $InstallDir ".plaky115.new.$([guid]::NewGuid())"
    Copy-Item -LiteralPath $extracted -Destination $staged
    if (Test-Path -LiteralPath $target) {
        $backup = Join-Path $InstallDir ".plaky115.backup.$([guid]::NewGuid())"
        Move-Item -LiteralPath $target -Destination $backup
    }
    try {
        if ($Testing -and $env:PLAKY115_INSTALL_TEST_FAIL_REPLACE -eq "1") { throw "simulated atomic replacement failure" }
        Move-Item -LiteralPath $staged -Destination $target
        $staged = $null
        $targetItem = Get-Item -LiteralPath $target
        if ($targetItem.PSIsContainer -or ($targetItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw "installed binary is not a regular file" }
        if ($backup) {
            Remove-Item -LiteralPath $backup -Force
            $backup = $null
        }
    } catch {
        $replacementError = $_
        if ($backup) {
            try {
                if ($Testing -and $env:PLAKY115_INSTALL_TEST_FAIL_RESTORE -eq "1") { throw "simulated restore failure" }
                if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force }
                Move-Item -LiteralPath $backup -Destination $target
                $backup = $null
            } catch {
                $backupPreserved = $true
                throw "replacement failed; recovery backup preserved at $backup"
            }
        }
        throw $replacementError
    }
    Write-Host "plaky115 $Version installed to $target"
} finally {
    if ($staged -and (Test-Path -LiteralPath $staged)) { Remove-Item -LiteralPath $staged -Force }
    if ($backup -and -not $backupPreserved -and (Test-Path -LiteralPath $backup)) { Remove-Item -LiteralPath $backup -Force }
    if (Test-Path -LiteralPath $tempDir) { Remove-Item -LiteralPath $tempDir -Recurse -Force }
    if ($script:HttpClient) { $script:HttpClient.Dispose() }
    if ($handler) { $handler.Dispose() }
}
