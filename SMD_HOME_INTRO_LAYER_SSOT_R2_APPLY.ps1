# SMD_HOME_INTRO_LAYER_SSOT_R2: verify entire overlay before a single write.
# Run from the extracted overlay folder; never applies to a changed parent silently.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ProjectRoot,
  [switch]$Apply
)
$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$Manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'SMD_HOME_INTRO_LAYER_SSOT_R2_MANIFEST.json') -Raw | ConvertFrom-Json
function Get-FileSha([string]$Path) {
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}
$Pending = New-Object System.Collections.Generic.List[object]
foreach ($Item in $Manifest.files) {
  $Relative = [string]$Item.path
  if ([System.IO.Path]::IsPathRooted($Relative) -or $Relative.Contains('..')) { throw "OVERLAY_PATH_INVALID: $Relative" }
  $ExpectedFile = Join-Path $PSScriptRoot ($Relative -replace '/',[IO.Path]::DirectorySeparatorChar)
  $ActualFile = Join-Path $ProjectRoot ($Relative -replace '/',[IO.Path]::DirectorySeparatorChar)
  if (!(Test-Path -LiteralPath $ExpectedFile -PathType Leaf) -or !(Test-Path -LiteralPath $ActualFile -PathType Leaf)) {
    throw "OVERLAY_FILE_MISSING: $Relative"
  }
  if ((Get-FileSha $ExpectedFile) -ne [string]$Item.targetSha256) { throw "OVERLAY_BYTES_INVALID: $Relative" }
  $Current = Get-FileSha $ActualFile
  if ($Current -eq [string]$Item.targetSha256) {
    Write-Host "ALREADY_CURRENT $Relative"
  } elseif ($Current -eq [string]$Item.parentSha256) {
    $Pending.Add([PSCustomObject]@{Path=$Relative; Target=$ActualFile; Source=$ExpectedFile})
  } else {
    throw "PARENT_SOURCE_DRIFT: $Relative $Current"
  }
}
Write-Host "PASS_SMD_INTRO_OVERLAY_PREFLIGHT pending=$($Pending.Count)"
if (!$Apply -or $Pending.Count -eq 0) { return }
$BackupRoot = Join-Path ([IO.Path]::GetTempPath()) ("SMD_HOME_INTRO_LAYER_SSOT_R2_" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
$Written = New-Object System.Collections.Generic.List[object]
try {
  foreach ($File in $Pending) {
    $Backup = Join-Path $BackupRoot ($File.Path -replace '/',[IO.Path]::DirectorySeparatorChar)
    $BackupDir = Split-Path -Parent $Backup
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    Copy-Item -LiteralPath $File.Target -Destination $Backup -Force
    $Written.Add([PSCustomObject]@{Target=$File.Target; Backup=$Backup})
    Copy-Item -LiteralPath $File.Source -Destination $File.Target -Force
  }
  foreach ($Item in $Manifest.files) {
    $Target = Join-Path $ProjectRoot ($Item.path -replace '/',[IO.Path]::DirectorySeparatorChar)
    if ((Get-FileSha $Target) -ne [string]$Item.targetSha256) { throw "TARGET_SHA_MISMATCH: $($Item.path)" }
  }
  Write-Host 'PASS_SMD_HOME_INTRO_LAYER_SSOT_R2_SOURCE_APPLIED' -ForegroundColor Green
  Write-Host "Backups kept at: $BackupRoot"
} catch {
  $Reason = $_
  foreach ($File in $Written) { Copy-Item -LiteralPath $File.Backup -Destination $File.Target -Force }
  throw "APPLY_ABORTED_AND_ROLLED_BACK: $Reason"
}
