param(
  [switch]$Watch,
  [int]$IntervalSeconds = 2
)

$ErrorActionPreference = "Stop"

$Root = Join-Path $HOME ".cc-connect"
$RunnerDir = Join-Path $Root "agent-runner"
$RequestsDir = Join-Path $RunnerDir "requests"
$ResultsDir = Join-Path $RunnerDir "results"
$UploadsDir = Join-Path $Root "uploads"
$HeartbeatFile = Join-Path $RunnerDir "heartbeat.json"

function Ensure-Dirs {
  foreach ($dir in @($RunnerDir, $RequestsDir, $ResultsDir, $UploadsDir)) {
    if (-not (Test-Path -LiteralPath $dir)) {
      New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
  }
}

function Write-JsonAtomic {
  param([string]$Path, [object]$Data)
  $tmp = "$Path.$PID.tmp"
  $Data | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $tmp -Encoding UTF8
  Move-Item -LiteralPath $tmp -Destination $Path -Force
}

function Write-Heartbeat {
  param([string]$Status = "idle", [string]$Detail = "")
  Ensure-Dirs
  Write-JsonAtomic -Path $HeartbeatFile -Data ([ordered]@{
    status = $Status
    detail = $Detail
    pid = $PID
    runner = "powershell"
    updated_at = (Get-Date).ToUniversalTime().ToString("o")
  })
}

function Get-GitEntries {
  param([string]$WorkDir)
  $entries = @{}
  try {
    Push-Location $WorkDir
    $lines = git -c core.quotepath=false status --porcelain 2>$null
    foreach ($line in $lines) {
      if (-not $line -or $line.Length -lt 4) { continue }
      $statusCode = $line.Substring(0, 2)
      $filePath = $line.Substring(3).Trim()
      if ($filePath -like "* -> *") {
        $parts = $filePath -split " -> "
        $filePath = $parts[$parts.Length - 1]
      }
      $abs = Join-Path $WorkDir $filePath
      $mtime = 0
      $size = 0
      if (Test-Path -LiteralPath $abs) {
        $item = Get-Item -LiteralPath $abs
        $mtime = [int64]$item.LastWriteTimeUtc.Ticks
        $size = [int64]$item.Length
      }
      $entries[$filePath] = [ordered]@{
        path = $filePath
        statusCode = $statusCode
        mtime = $mtime
        size = $size
      }
    }
  } catch {
  } finally {
    try { Pop-Location } catch {}
  }
  return $entries
}

function Describe-Status {
  param([string]$StatusCode)
  $code = ($StatusCode + "  ").Substring(0, 2)
  $compact = $code.Trim()
  if ($compact -eq "??") { return @{ statusText = "added"; statusKind = "added" } }
  if ($code.Contains("D")) { return @{ statusText = "deleted"; statusKind = "deleted" } }
  if ($code.Contains("R")) { return @{ statusText = "renamed"; statusKind = "renamed" } }
  if ($code.Contains("A")) { return @{ statusText = "added"; statusKind = "added" } }
  return @{ statusText = "modified"; statusKind = "modified" }
}

function Get-FileChanges {
  param([string]$WorkDir, [hashtable]$Before)
  $after = Get-GitEntries -WorkDir $WorkDir
  $files = @()
  foreach ($key in $after.Keys) {
    $entry = $after[$key]
    $old = $Before[$key]
    $changed = $false
    if (-not $old) {
      $changed = $true
    } elseif ($old.statusCode -ne $entry.statusCode -or $old.mtime -ne $entry.mtime -or $old.size -ne $entry.size) {
      $changed = $true
    }
    if (-not $changed) { continue }
    $desc = Describe-Status -StatusCode $entry.statusCode
    $files += [ordered]@{
      path = $entry.path
      statusText = $desc.statusText
      statusKind = $desc.statusKind
      diff = [ordered]@{
        available = $false
        reason = "PowerShell runner does not compute inline diff"
        additions = 0
        deletions = 0
      }
    }
  }
  return [ordered]@{ files = $files; count = $files.Count }
}

function Invoke-Agent {
  param([string]$AgentType, [string]$MessageFile, [string]$WorkDir)
  Push-Location $WorkDir
  try {
    $inputText = Get-Content -LiteralPath $MessageFile -Raw -Encoding UTF8
    switch ($AgentType) {
      "cursor" { $output = $inputText | agent -p 2>&1 | Out-String }
      "gemini" { $output = $inputText | gemini -p 2>&1 | Out-String }
      "codex" { $output = $inputText | codex -q 2>&1 | Out-String }
      default { $output = $inputText | claude --permission-mode acceptEdits -p 2>&1 | Out-String }
    }
    return [ordered]@{ exitCode = $LASTEXITCODE; output = $output.Trim() }
  } finally {
    Pop-Location
  }
}

function Get-AgentCommandLabel {
  param([string]$AgentType)
  switch ($AgentType) {
    "cursor" { return "agent -p" }
    "gemini" { return "gemini -p" }
    "codex" { return "codex -q" }
    default { return "claude --permission-mode acceptEdits -p" }
  }
}

function Set-RequestStatus {
  param([string]$Path, [object]$Request, [string]$Status, [string]$ErrorText = "")
  $stateDir = Join-Path $RunnerDir "states"
  if (-not (Test-Path -LiteralPath $stateDir)) {
    New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
  }
  $id = if ($Request.id) { [string]$Request.id } else { [IO.Path]::GetFileNameWithoutExtension($Path) }
  Write-JsonAtomic -Path (Join-Path $stateDir "$id.json") -Data ([ordered]@{
    id = $id
    status = $Status
    error = $ErrorText
    updated_at = (Get-Date).ToUniversalTime().ToString("o")
  })
}

function Invoke-RunnerRequest {
  param([string]$RequestFile)
  $request = Get-Content -LiteralPath $RequestFile -Raw -Encoding UTF8 | ConvertFrom-Json
  if (-not $request.id -or $request.status -eq "done" -or $request.status -eq "running") { return $false }

  $resultFile = Join-Path $ResultsDir "$($request.id).json"
  if (Test-Path -LiteralPath $resultFile) { return $false }

  Set-RequestStatus -Path $RequestFile -Request $request -Status "running"
  Write-Heartbeat -Status "running" -Detail "$($request.projectName) $($request.id)"

  $messageFile = Join-Path $UploadsDir "_psrunner_$($request.id).txt"
  $workDir = if ($request.workDir) { [string]$request.workDir } else { (Get-Location).Path }
  $agentType = if ($request.agentType) { [string]$request.agentType } else { "claudecode" }
  $commandLabel = Get-AgentCommandLabel -AgentType $agentType
  $before = Get-GitEntries -WorkDir $workDir

  try {
    [string]$request.message | Set-Content -LiteralPath $messageFile -Encoding UTF8
    $agentResult = Invoke-Agent -AgentType $agentType -MessageFile $messageFile -WorkDir $workDir
    $fileChanges = Get-FileChanges -WorkDir $workDir -Before $before
    $success = ($agentResult.exitCode -eq 0)
    Write-JsonAtomic -Path $resultFile -Data ([ordered]@{
      id = $request.id
      success = $success
      output = $agentResult.output
      error = $(if ($success) { "" } else { $agentResult.output })
      fileChanges = $fileChanges
      agentType = $agentType
      command = $commandLabel
      exitCode = $agentResult.exitCode
      runner = "powershell"
      completed_at = (Get-Date).ToUniversalTime().ToString("o")
    })
    Set-RequestStatus -Path $RequestFile -Request $request -Status $(if ($success) { "done" } else { "failed" }) -ErrorText $(if ($success) { "" } else { $agentResult.output })
  } catch {
    $fileChanges = Get-FileChanges -WorkDir $workDir -Before $before
    Write-JsonAtomic -Path $resultFile -Data ([ordered]@{
      id = $request.id
      success = $false
      output = [string]$_.Exception.Message
      error = [string]$_.Exception.Message
      fileChanges = $fileChanges
      agentType = $agentType
      command = $commandLabel
      exitCode = $null
      runner = "powershell"
      completed_at = (Get-Date).ToUniversalTime().ToString("o")
    })
    Set-RequestStatus -Path $RequestFile -Request $request -Status "failed" -ErrorText ([string]$_.Exception.Message)
  } finally {
    try { Remove-Item -LiteralPath $messageFile -Force } catch {}
    Write-Heartbeat -Status "idle" -Detail ""
  }
  return $true
}

function Invoke-RunnerOnce {
  Ensure-Dirs
  Write-Heartbeat -Status "scanning" -Detail ""
  $handled = 0
  $files = Get-ChildItem -LiteralPath $RequestsDir -Filter "*.json" -File | Sort-Object Name
  foreach ($file in $files) {
    try {
      if (Invoke-RunnerRequest -RequestFile $file.FullName) { $handled++ }
    } catch {
      Write-Host "[agent-runner.ps1] $($file.Name) $($_.Exception.Message)"
    }
  }
  Write-Heartbeat -Status "idle" -Detail ""
  return $handled
}

Ensure-Dirs
Write-Host "[agent-runner.ps1] $($(if ($Watch) { 'watching' } else { 'running once' })) $RequestsDir"
if (-not $Watch) {
  $count = Invoke-RunnerOnce
  Write-Host "[agent-runner.ps1] handled $count request(s)"
  exit 0
}

while ($true) {
  Invoke-RunnerOnce | Out-Null
  Start-Sleep -Seconds $IntervalSeconds
}

