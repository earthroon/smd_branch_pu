# SMD_HOME_INTRO_VIEWPORT_FILL_R4: strict parent-byte/target-byte admission.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ProjectRoot,[switch]$Apply)
$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$Manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'MANIFEST.json') -Raw | ConvertFrom-Json
function Hash([string]$P) { (Get-FileHash -LiteralPath $P -Algorithm SHA256).Hash.ToLowerInvariant() }
$Pending = [System.Collections.Generic.List[object]]::new()
foreach($Item in $Manifest.files) {
  $Relative = [string]$Item.path
  if($Relative -match '(^[/\\]|(^|[/\\])\.\.([/\\]|$)|:)' ) { throw "OVERLAY_PATH_INVALID: $Relative" }
  $Name = $Relative.Replace('/',[IO.Path]::DirectorySeparatorChar)
  $Source = Join-Path $PSScriptRoot $Name
  $Dest = Join-Path $ProjectRoot $Name
  if(!(Test-Path -LiteralPath $Source -PathType Leaf)) { throw "OVERLAY_FILE_MISSING: $Relative" }
  if((Hash $Source) -ne [string]$Item.targetSha256) { throw "OVERLAY_SHA_MISMATCH: $Relative" }
  if(Test-Path -LiteralPath $Dest -PathType Leaf) {
    $Current = Hash $Dest
    if($Current -eq [string]$Item.targetSha256) { Write-Host "ALREADY_CURRENT $Relative"; continue }
    if($Item.parentSha256 -eq $null -or $Current -ne [string]$Item.parentSha256) {throw "PARENT_SOURCE_DRIFT: $Relative"}
    $Pending.Add([PSCustomObject]@{ Relative=$Relative;Source=$Source;Dest=$Dest;Existing=$true })
  } else {
    if($Item.parentSha256 -ne $null) {throw "PARENT_FILE_MISSING: $Relative"}
    $Pending.Add([PSCustomObject]@{ Relative=$Relative;Source=$Source;Dest=$Dest;Existing=$false })
  }
}
# Immutable Figma source / Wind LUT / original photographs must still be unchanged.
foreach($Entry in $Manifest.immutableInputs.PSObject.Properties) {
 $P = Join-Path $ProjectRoot $Entry.Name.Replace('/',[IO.Path]::DirectorySeparatorChar)
 if(!(Test-Path -LiteralPath $P -PathType Leaf) -or (Hash $P) -ne [string]$Entry.Value) {
   throw "IMMUTABLE_INPUT_DRIFT: $($Entry.Name)"
 }
}
Write-Host "PASS_R4_PREFLIGHT pending=$($Pending.Count)"
if(!$Apply -or $Pending.Count -eq 0) {return}
$BackupRoot=Join-Path ([IO.Path]::GetTempPath()) ('SMD_INTRO_R4_' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
$Written=[System.Collections.Generic.List[object]]::new()
try {
 foreach($F in $Pending) {
   $Backup=Join-Path $BackupRoot $F.Relative.Replace('/',[IO.Path]::DirectorySeparatorChar)
   New-Item -ItemType Directory -Force -Path (Split-Path -Parent $F.Dest) | Out-Null
   if($F.Existing) {
     New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Backup) | Out-Null
     Copy-Item -LiteralPath $F.Dest -Destination $Backup -Force
   }
   $Written.Add([PSCustomObject]@{Dest=$F.Dest;Backup=$Backup;Existing=$F.Existing})
   Copy-Item -LiteralPath $F.Source -Destination $F.Dest -Force
 }
 foreach($Item in $Manifest.files) {
  $Dest=Join-Path $ProjectRoot ([string]$Item.path).Replace('/',[IO.Path]::DirectorySeparatorChar)
  if((Hash $Dest) -ne [string]$Item.targetSha256) { throw "APPLY_TARGET_DRIFT: $($Item.path)" }
 }
 Write-Host 'PASS_SMD_HOME_INTRO_VIEWPORT_FILL_R4_APPLIED' -ForegroundColor Green
 Write-Host "Backup: $BackupRoot"
} catch {
 $Reason=$_
 foreach($F in $Written) {
  if($F.Existing) {Copy-Item -LiteralPath $F.Backup -Destination $F.Dest -Force}
  elseif(Test-Path -LiteralPath $F.Dest) {Remove-Item -LiteralPath $F.Dest -Force}
 }
 throw "APPLY_ROLLED_BACK: $Reason"
}
