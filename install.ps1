param([string]$SkillsDirectory)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $SkillsDirectory) {
    $codexLocation = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
    $SkillsDirectory = Join-Path $codexLocation 'skills'
}
$skillsRoot = [System.IO.Path]::GetFullPath($SkillsDirectory)
$destination = [System.IO.Path]::GetFullPath((Join-Path $skillsRoot 'blockbench-modeling'))
if ([System.IO.Path]::GetDirectoryName($destination) -ne $skillsRoot.TrimEnd('\','/')) {
    throw 'Skill destination must be a direct child of the requested skills folder.'
}
$source = Join-Path $projectRoot 'skill\blockbench-modeling'
if (-not (Test-Path -LiteralPath (Join-Path $source 'assets\codex_blockbench_bridge.js'))) {
    throw 'Built plugin missing. Run node tools/build.mjs from the project directory first.'
}
New-Item -ItemType Directory -Path $skillsRoot -Force | Out-Null
if (Test-Path -LiteralPath $destination) {
    $backupRoot = Join-Path (Split-Path -Parent $skillsRoot) 'skill-backups'
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    $backup = Join-Path $backupRoot ('blockbench-modeling-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,8))
    $backup = [System.IO.Path]::GetFullPath($backup)
    $backupRoot = [System.IO.Path]::GetFullPath($backupRoot)
    if ([System.IO.Path]::GetDirectoryName($backup) -ne $backupRoot.TrimEnd('\','/')) {
        throw 'Backup destination must stay inside the skill-backups folder.'
    }
    Move-Item -LiteralPath $destination -Destination $backup
    Write-Output "Previous skill backed up to: $backup"
}
New-Item -ItemType Directory -Path $destination -Force | Out-Null
Get-ChildItem -LiteralPath $source -Recurse -File | Where-Object {
    $_.Extension -ne '.pyc' -and $_.FullName -notmatch '[\\/]__pycache__[\\/]'
} | ForEach-Object {
    $relativePath = $_.FullName.Substring($source.Length).TrimStart('\','/')
    $targetFile = Join-Path $destination $relativePath
    New-Item -ItemType Directory -Path (Split-Path -Parent $targetFile) -Force | Out-Null
    Copy-Item -LiteralPath $_.FullName -Destination $targetFile
}
Write-Output "Installed skill: $destination"
Write-Output "Load this file in Blockbench > File > Plugins > Load Plugin from File:"
Write-Output (Join-Path $destination 'assets\codex_blockbench_bridge.js')
Write-Output 'Grant the plugin permission to its dedicated bridge folder when Blockbench asks.'
Write-Output 'Use a new Codex chat if the skill is not discovered in the current chat.'
