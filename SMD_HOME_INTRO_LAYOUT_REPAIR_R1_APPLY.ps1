param(
  [Parameter(Mandatory=$true)][string]$ProjectRoot,
  [Parameter(Mandatory=$true)][string]$PatchRoot,
  [switch]$Apply,
  [switch]$VerifyOnly
)
$ErrorActionPreference = 'Stop'
$Contract = 'SMD_HOME_INTRO_LAYOUT_REPAIR_R1'
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$PatchRoot = (Resolve-Path -LiteralPath $PatchRoot).Path
$ManifestFile = Join-Path $PatchRoot ($Contract + '_MANIFEST.json')
if (!(Test-Path -LiteralPath $ManifestFile -PathType Leaf)) { throw 'INTRO_R1_MANIFEST_MISSING' }
$Manifest = Get-Content -LiteralPath $ManifestFile -Raw | ConvertFrom-Json
if ($Manifest.contract -cne $Contract) { throw 'INTRO_R1_MANIFEST_CONTRACT_MISMATCH' }
if ($Apply -and $VerifyOnly) { throw 'INTRO_R1_MODE_CONFLICT' }
function Sha([string]$file) { return (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() }
$Queue = @()
foreach ($entry in $Manifest.entries) {
  $relative = [string]$entry.path
  if ($relative -notmatch '^[a-zA-Z0-9_.\/-]+$' -or $relative -match '(^|/|\\)\.\.(/|\\|$)') {
    throw "INTRO_R1_UNSAFE_PATH: $relative"
  }
  $src = Join-Path $PatchRoot ($relative -replace '/', [IO.Path]::DirectorySeparatorChar)
  $dst = Join-Path $ProjectRoot ($relative -replace '/', [IO.Path]::DirectorySeparatorChar)
  if (!(Test-Path -LiteralPath $src -PathType Leaf)) { throw "INTRO_R1_SOURCE_MISSING: $relative" }
  if ((Sha $src) -cne [string]$entry.sourceSha256) { throw "INTRO_R1_SOURCE_SHA_MISMATCH: $relative" }
  $exists = Test-Path -LiteralPath $dst -PathType Leaf
  $actual = if ($exists) { Sha $dst } else { $null }
  $desired = [string]$entry.sourceSha256
  switch ([string]$entry.operation) {
    'modify' {
      if (!$exists) { throw "INTRO_R1_PARENT_MISSING: $relative" }
      if ($actual -cne [string]$entry.parentSha256 -and $actual -cne $desired) {
        throw "INTRO_R1_PARENT_SHA_DRIFT: $relative"
      }
    }
    'add' {
      if ($exists -and $actual -cne $desired) { throw "INTRO_R1_NEW_FILE_CONFLICT: $relative" }
    }
    default { throw "INTRO_R1_UNKNOWN_OPERATION: $relative" }
  }
  $Queue += [pscustomobject]@{rel=$relative;src=$src;dst=$dst;changed=($actual -cne $desired)}
}
$Need = @($Queue | Where-Object {$_.changed})
Write-Host "INTRO_R1_PREFLIGHT_PASS entries=$($Queue.Count) changes=$($Need.Count)"
if (!$Apply) { return }
$Backup = Join-Path $env:TEMP ('SMD_HOME_INTRO_R1_' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $Backup | Out-Null
$Done = @()
try {
  foreach ($item in $Need) {
    $b = Join-Path $Backup ($item.rel -replace '/', [IO.Path]::DirectorySeparatorChar)
    New-Item -ItemType Directory -Path (Split-Path -Parent $b) -Force | Out-Null
    $existed = Test-Path -LiteralPath $item.dst -PathType Leaf
    if ($existed) { Copy-Item -LiteralPath $item.dst -Destination $b }
    New-Item -ItemType Directory -Path (Split-Path -Parent $item.dst) -Force | Out-Null
    $Done += [pscustomobject]@{destination=$item.dst; backup=$b; existed=$existed}
    Copy-Item -LiteralPath $item.src -Destination $item.dst -Force
  }
  foreach ($item in $Queue) {
    if ((Sha $item.dst) -cne [string](@($Manifest.entries | Where-Object {$_.path -ceq $item.rel})[0]).sourceSha256) {
      throw "INTRO_R1_POST_APPLY_SHA_MISMATCH: $($item.rel)"
    }
  }
  Write-Host "PASS_SMD_HOME_INTRO_LAYOUT_REPAIR_R1_APPLIED changed=$($Need.Count)"
} catch {
  $message = $_
  [array]::Reverse($Done)
  foreach ($item in $Done) {
    if ($item.existed) { Copy-Item -LiteralPath $item.backup -Destination $item.destination -Force }
    elseif (Test-Path -LiteralPath $item.destination) { Remove-Item -LiteralPath $item.destination -Force }
  }
  throw "INTRO_R1_APPLY_FAILED_ROLLED_BACK: $message"
} finally {
  Remove-Item -LiteralPath $Backup -Recurse -Force -ErrorAction SilentlyContinue
}
