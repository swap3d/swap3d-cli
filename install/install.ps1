[CmdletBinding()]
param(
    [string]$Version = $env:SWAP3D_VERSION,
    [string]$InstallDir = $env:SWAP3D_INSTALL_DIR
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($Version)) {
    $Version = 'latest'
}

if ([string]::IsNullOrWhiteSpace($InstallDir)) {
    $InstallDir = Join-Path $env:LOCALAPPDATA 'Programs\Swap3D\bin'
}

$repository = if ($env:SWAP3D_GITHUB_REPOSITORY) {
    $env:SWAP3D_GITHUB_REPOSITORY
} else {
    'swap3d/swap3d-cli'
}

$releaseBaseUrl = if ($env:SWAP3D_RELEASE_BASE_URL) {
    $env:SWAP3D_RELEASE_BASE_URL.TrimEnd('/')
} else {
    "https://github.com/$repository/releases"
}

if ($Version -eq 'latest') {
    $releaseUrl = "$releaseBaseUrl/latest/download"
} elseif ($Version -match '^v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$') {
    $Version = "v$($Matches[1])"
    $releaseUrl = "$releaseBaseUrl/download/$Version"
} else {
    throw "Invalid version '$Version'. Expected latest or x.y.z."
}

$architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
switch ($architecture) {
    'X64' { $targetArchitecture = 'x64' }
    'Arm64' { $targetArchitecture = 'arm64' }
    default { throw "Unsupported Windows architecture: $architecture" }
}

$asset = "swap3d-windows-$targetArchitecture.zip"
$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "swap3d-install-$([guid]::NewGuid())"
$archivePath = Join-Path $temporaryDirectory $asset
$checksumPath = Join-Path $temporaryDirectory 'SHA256SUMS'
$extractPath = Join-Path $temporaryDirectory 'extract'

try {
    New-Item -ItemType Directory -Path $temporaryDirectory -Force | Out-Null

    Write-Host "Downloading Swap3D CLI $Version for windows-$targetArchitecture..."
    Invoke-WebRequest -Uri "$releaseUrl/$asset" -OutFile $archivePath -UseBasicParsing
    Invoke-WebRequest -Uri "$releaseUrl/SHA256SUMS" -OutFile $checksumPath -UseBasicParsing

    $escapedAsset = [regex]::Escape($asset)
    $checksumContent = Get-Content -Raw -Path $checksumPath
    $checksumMatch = [regex]::Match($checksumContent, "(?mi)^([a-f0-9]{64})\s{2}$escapedAsset$")
    if (-not $checksumMatch.Success) {
        throw "SHA256SUMS does not contain $asset."
    }

    $expectedChecksum = $checksumMatch.Groups[1].Value.ToLowerInvariant()
    $actualChecksum = (Get-FileHash -Algorithm SHA256 -Path $archivePath).Hash.ToLowerInvariant()
    if ($actualChecksum -ne $expectedChecksum) {
        throw "Checksum verification failed for $asset."
    }

    Expand-Archive -Path $archivePath -DestinationPath $extractPath -Force
    $sourceBinary = Join-Path $extractPath 'swap3d.exe'
    if (-not (Test-Path -Path $sourceBinary -PathType Leaf)) {
        throw 'Release archive does not contain swap3d.exe.'
    }

    $targetPath = Join-Path $InstallDir 'swap3d.exe'
    $existingCommand = Get-Command swap3d -ErrorAction SilentlyContinue
    if ($existingCommand -and $existingCommand.Source -ne $targetPath) {
        Write-Warning "Another swap3d command exists at $($existingCommand.Source). PATH order will decide which installation is used."
    }

    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Copy-Item -Path $sourceBinary -Destination $targetPath -Force

    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $pathEntries = @($userPath -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($pathEntries -notcontains $InstallDir) {
        $newUserPath = (@($pathEntries) + $InstallDir) -join ';'
        [Environment]::SetEnvironmentVariable('Path', $newUserPath, 'User')
        Write-Host "Added $InstallDir to the user PATH."
    }

    if (($env:Path -split ';') -notcontains $InstallDir) {
        $env:Path = "$InstallDir;$env:Path"
    }

    $installedVersion = & $targetPath --version
    Write-Host "Swap3D CLI $installedVersion installed at $targetPath"
    Write-Host 'Run: swap3d --help'
} finally {
    if (Test-Path $temporaryDirectory) {
        Remove-Item -Recurse -Force $temporaryDirectory
    }
}
