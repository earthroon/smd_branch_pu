param(
    [Parameter(Mandatory=$true)][string]$ProjectRoot,
    [switch]$VerifyOnly,
    [switch]$Apply
)
$ErrorActionPreference='Stop'
if ([bool]$VerifyOnly -eq [bool]$Apply) { throw 'CHOOSE_EXACTLY_ONE_OF_VERIFYONLY_OR_APPLY' }
$PackageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Manifest = Get-Content -LiteralPath (Join-Path $PackageRoot 'FILM_R13_NONLINEAR_WIND_R1_APPLY_MANIFEST.json') -Raw | ConvertFrom-Json
$Root = (Resolve-Path -LiteralPath $ProjectRoot).Path
$actions = @()
foreach ($entry in $Manifest.files) {
    $relative = [string]$entry.path
    if ($relative.Contains('..') -or [IO.Path]::IsPathRooted($relative)) { throw "UNSAFE_PATH: $relative" }
    $target = Join-Path $Root $relative
    $source = Join-Path $PackageRoot $relative
    if (!(Test-Path -LiteralPath $source -PathType Leaf)) { throw "PATCH_INPUT_MISSING: $relative" }
    $sourceSha = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($sourceSha -cne [string]$entry.bakedSha256) { throw "PATCH_BYTES_DRIFT: $relative" }
    $currentSha = $null
    if (Test-Path -LiteralPath $target -PathType Leaf) {
        $currentSha = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    if ($currentSha -ceq [string]$entry.bakedSha256) {
        $actions += "ALREADY_APPLIED: $relative"
        continue
    }
    if ([string]$entry.action -ceq 'MODIFY') {
        if ($currentSha -cne [string]$entry.parentSha256) { throw "PARENT_SOURCE_DRIFT: $relative" }
    } elseif ([string]$entry.action -ceq 'ADD') {
        if ($null -ne $currentSha) { throw "NEW_SOURCE_COLLISION: $relative" }
    } else { throw "UNKNOWN_MANIFEST_ACTION: $relative" }
    $actions += "APPLY: $relative"
}
$actions | ForEach-Object { Write-Host $_ }
if ($VerifyOnly) { Write-Host 'PASS_FILM_WIND_R1_PREFLIGHT_READONLY'; exit 0 }
foreach ($entry in $Manifest.files) {
    $relative=[string]$entry.path
    $target=Join-Path $Root $relative
    $source=Join-Path $PackageRoot $relative
    $currentSha=$null
    if (Test-Path -LiteralPath $target -PathType Leaf) {
        $currentSha=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    if ($currentSha -ceq [string]$entry.bakedSha256) { continue }
    $parentDir=Split-Path -Parent $target
    if (!(Test-Path -LiteralPath $parentDir)) { New-Item -ItemType Directory -Path $parentDir -Force | Out-Null }
    Copy-Item -LiteralPath $source -Destination $target
    $after=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($after -cne [string]$entry.bakedSha256) { throw "VERIFY_AFTER_APPLY_FAILED: $relative" }
}
Write-Host 'PASS_FILM_WIND_R1_LOCAL_APPLY' -ForegroundColor Green
