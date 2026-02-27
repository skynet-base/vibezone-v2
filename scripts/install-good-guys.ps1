param(
  [string]$RepoUrl = 'https://github.com/skynet-base/good-guys.git',
  [string[]]$Nodes = @('pc2', 'vps', 'pc4'),
  [switch]$SkipRemote
)

$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "[good-guys] $Message"
}

function Encode-PowerShellScript {
  param([string]$Script)
  return [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Script))
}

function Install-LocalFromWorkspace {
  $workspaceRoot = Split-Path -Parent $PSScriptRoot
  $source = Join-Path $workspaceRoot 'good-guys'
  $target = Join-Path $HOME '.claude\good-guys'

  if (-not (Test-Path $source)) {
    throw "Workspace source not found: $source"
  }

  Write-Step "Installing local copy to $target"
  New-Item -ItemType Directory -Path $target -Force | Out-Null

  Get-ChildItem -Force $source | ForEach-Object {
    if ($_.Name -eq '.git') { return }
    $dest = Join-Path $target $_.Name
    if (Test-Path $dest) {
      Remove-Item -Recurse -Force $dest
    }
    Copy-Item -Recurse -Force $_.FullName $dest
  }

  $toolPath = Join-Path $target 'bin\gg-tools.cjs'
  if (-not (Test-Path $toolPath)) {
    throw "Local install failed, missing $toolPath"
  }

  Write-Step "Local install complete."
}

function Try-InstallRemoteWindows {
  param(
    [string]$Node,
    [string]$Repo
  )

  $script = @"
`$ErrorActionPreference='Stop'
`$target = Join-Path `$HOME '.claude\good-guys'
if (Test-Path (Join-Path `$target '.git')) {
  git -C `$target pull --ff-only
} else {
  New-Item -ItemType Directory -Path (Split-Path -Parent `$target) -Force | Out-Null
  if (Test-Path `$target) { Remove-Item -Recurse -Force `$target }
  git clone $Repo `$target
}
if (-not (Test-Path (Join-Path `$target 'bin\gg-tools.cjs'))) {
  throw 'gg-tools.cjs missing after install'
}
Write-Output 'OK_WINDOWS'
"@

  $encoded = Encode-PowerShellScript $script
  ssh -o ConnectTimeout=10 -o BatchMode=yes $Node "powershell -NoProfile -NonInteractive -EncodedCommand $encoded"
}

function Try-InstallRemoteLinux {
  param(
    [string]$Node,
    [string]$Repo
  )

  $cmd = @"
set -e
TARGET="\$HOME/.claude/good-guys"
if [ -d "\$TARGET/.git" ]; then
  git -C "\$TARGET" pull --ff-only
else
  mkdir -p "\$HOME/.claude"
  rm -rf "\$TARGET"
  git clone $Repo "\$TARGET"
fi
test -f "\$TARGET/bin/gg-tools.cjs"
echo OK_LINUX
"@

  ssh -o ConnectTimeout=10 -o BatchMode=yes $Node "bash -lc '$cmd'"
}

function Install-RemoteNode {
  param(
    [string]$Node,
    [string]$Repo
  )

  Write-Step "Installing on $Node ..."

  try {
    $out = Try-InstallRemoteWindows -Node $Node -Repo $Repo 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0 -and $out -match 'OK_WINDOWS') {
      Write-Step "$Node install complete (windows)"
      return
    }
  } catch {
    # fallback to linux
  }

  try {
    $out = Try-InstallRemoteLinux -Node $Node -Repo $Repo 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0 -and $out -match 'OK_LINUX') {
      Write-Step "$Node install complete (linux)"
      return
    }
  } catch {
    # handled below
  }

  throw "Remote install failed on $Node"
}

Install-LocalFromWorkspace

if (-not $SkipRemote) {
  foreach ($node in $Nodes) {
    try {
      Install-RemoteNode -Node $node -Repo $RepoUrl
    } catch {
      Write-Warning "[good-guys] $node failed: $($_.Exception.Message)"
    }
  }
}

Write-Step 'Done.'
