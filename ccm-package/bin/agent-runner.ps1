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

function Get-ProjectVerificationCommands {
  param([string]$ProjectName)
  $configFile = Join-Path $Root "project-configs.json"
  if (-not (Test-Path -LiteralPath $configFile)) { return @() }
  try {
    $configs = Get-Content -LiteralPath $configFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $config = $configs.PSObject.Properties[$ProjectName].Value
    if (-not $config) { return @() }
    foreach ($name in @("verification_commands", "verificationCommands", "test_commands", "testCommands", "check_commands", "checkCommands")) {
      $value = $config.PSObject.Properties[$name].Value
      if ($value) { return @($value) }
    }
  } catch {}
  return @()
}

function Test-AgentProbeRequest {
  param([object]$Request)
  return ([string]$Request.message) -match "CCM_AGENT_PROBE_OK|执行通道健康探针"
}

function Format-CliAllowedTools {
  param([object]$CliAllowedTools, [string]$ProjectName = "")
  $items = @()
  if ($CliAllowedTools) {
    foreach ($item in @($CliAllowedTools)) {
      $value = ([string]$item).Trim()
      if ($value -and $value -ne "null") { $items += $value }
    }
  }
  if ($items.Count -eq 0 -and $ProjectName) {
    foreach ($command in Get-ProjectVerificationCommands -ProjectName $ProjectName) {
      $cmd = ([string]$command).Trim()
      if ($cmd) {
        $items += "Bash($cmd)"
        $items += "PowerShell($cmd)"
      }
    }
  }
  return (($items | Select-Object -Unique) -join ",")
}

function Invoke-ProjectVerificationCommands {
  param([string]$ProjectName, [string]$WorkDir)
  $commands = @(Get-ProjectVerificationCommands -ProjectName $ProjectName)
  $results = @()
  $verification = @()
  $failed = @()
  if (-not $commands -or $commands.Count -eq 0 -or -not $WorkDir) {
    return [ordered]@{ ccm_runner_verification = $true; status = "skipped"; verification = $verification; failed = $failed; results = $results }
  }

  Push-Location $WorkDir
  try {
    foreach ($command in $commands) {
      $cmd = ([string]$command).Trim()
      if (-not $cmd) { continue }
      try {
        $global:LASTEXITCODE = 0
        $output = Invoke-Expression $cmd 2>&1 | Out-String
        $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
        if ($exitCode -eq 0) {
          $verification += "$cmd passed by external runner (exit 0)"
          $results += [ordered]@{ command = $cmd; exitCode = 0; status = "passed"; output = ([string]$output).Trim() }
        } else {
          $failed += "$cmd failed by external runner (exit $exitCode)"
          $results += [ordered]@{ command = $cmd; exitCode = $exitCode; status = "failed"; output = ([string]$output).Trim() }
        }
      } catch {
        $failed += "$cmd failed by external runner"
        $results += [ordered]@{ command = $cmd; exitCode = $null; status = "failed"; output = [string]$_.Exception.Message }
      }
    }
  } finally {
    Pop-Location
  }

  return [ordered]@{
    ccm_runner_verification = $true
    status = $(if ($failed.Count -gt 0) { "failed" } else { "passed" })
    verification = $verification
    failed = $failed
    results = $results
  }
}

function Add-RunnerVerificationOutput {
  param([string]$Output, [object]$RunnerVerification)
  if (-not $RunnerVerification -or $RunnerVerification.status -eq "skipped") { return $Output }
  $json = $RunnerVerification | ConvertTo-Json -Depth 12
  $fence = ([string][char]96) * 3
  return $Output + "`n`nCCM_RUNNER_VERIFICATION`n" + $fence + "json`n" + $json + "`n" + $fence
}
function Invoke-Agent {
  param([string]$AgentType, [string]$MessageFile, [string]$WorkDir, [object]$CliAllowedTools = $null, [string]$ProjectName = "", [string]$McpConfigPath = "", [int]$TimeoutMs = 300000)
  $timeoutSeconds = [Math]::Max(1, [Math]::Ceiling($TimeoutMs / 1000))
  $job = Start-Job -ScriptBlock {
    param([string]$AgentType, [string]$MessageFile, [string]$WorkDir, [object]$CliAllowedTools, [string]$ProjectName, [string]$McpConfigPath)
    $ErrorActionPreference = "Stop"
    function Format-JobCliAllowedTools {
      param([object]$Tools)
      $items = @()
      if ($Tools) {
        foreach ($item in @($Tools)) {
          $value = ([string]$item).Trim()
          if ($value -and $value -ne "null") { $items += $value }
        }
      }
      return (($items | Select-Object -Unique) -join ",")
    }
    Push-Location $WorkDir
    try {
      $inputText = Get-Content -LiteralPath $MessageFile -Raw -Encoding UTF8
      switch ($AgentType) {
        "cursor" { $output = $inputText | agent -p 2>&1 | Out-String }
        "gemini" { $output = $inputText | gemini -p 2>&1 | Out-String }
        "codex" {
          $oldCodexHome = $env:CODEX_HOME
          if ($McpConfigPath) { $env:CODEX_HOME = Split-Path -Parent $McpConfigPath }
          try { $output = $inputText | codex exec --full-auto --ephemeral --skip-git-repo-check - 2>&1 | Out-String } finally { $env:CODEX_HOME = $oldCodexHome }
        }
        "qoder" { $output = $inputText | qodercli -p 2>&1 | Out-String }
        default {
          $claudeArgs = @("--permission-mode", "acceptEdits")
          $allowedToolsArg = Format-JobCliAllowedTools -Tools $CliAllowedTools
          if ($allowedToolsArg) { $claudeArgs += @("--allowed-tools", $allowedToolsArg) }
          if ($McpConfigPath) { $claudeArgs += @("--mcp-config", $McpConfigPath, "--strict-mcp-config") }
          $claudeArgs += "-p"
          $output = $inputText | claude @claudeArgs 2>&1 | Out-String
        }
      }
      return [ordered]@{ exitCode = $LASTEXITCODE; output = $output.Trim() }
    } finally {
      Pop-Location
    }
  } -ArgumentList $AgentType, $MessageFile, $WorkDir, $CliAllowedTools, $ProjectName, $McpConfigPath

  if (Wait-Job -Job $job -Timeout $timeoutSeconds) {
    try {
      $received = Receive-Job -Job $job
      if ($received -is [array]) { $received = $received[-1] }
      return $received
    } finally {
      Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    }
  }

  Stop-Job -Job $job -ErrorAction SilentlyContinue
  Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
  return [ordered]@{ exitCode = 124; output = "Agent timed out after $timeoutSeconds seconds; runner stopped this child call to keep the queue moving" }
}
function Get-AgentCommandLabel {
  param([string]$AgentType)
  switch ($AgentType) {
    "cursor" { return "agent -p" }
    "gemini" { return "gemini -p" }
    "codex" { return "codex exec --full-auto --ephemeral -" }
    "qoder" { return "qodercli -p" }
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
  $isProbeRequest = Test-AgentProbeRequest -Request $request
  $effectiveCliAllowedTools = if ($isProbeRequest) { "" } else { Format-CliAllowedTools -CliAllowedTools $request.cliAllowedTools -ProjectName $request.projectName }
  $effectiveCliAllowedToolsArray = if ($effectiveCliAllowedTools) { @($effectiveCliAllowedTools -split ",") } else { @() }
  $commandLabelForResult = if ($effectiveCliAllowedTools) { "$commandLabel --allowed-tools $effectiveCliAllowedTools" } else { $commandLabel }
  $before = Get-GitEntries -WorkDir $workDir

  try {
    [string]$request.message | Set-Content -LiteralPath $messageFile -Encoding UTF8
    $agentResult = Invoke-Agent -AgentType $agentType -MessageFile $messageFile -WorkDir $workDir -CliAllowedTools $effectiveCliAllowedToolsArray -ProjectName $request.projectName -McpConfigPath ([string]$request.mcpConfigPath) -TimeoutMs ([int]$request.timeoutMs)
    $runnerVerification = if ($isProbeRequest) { [ordered]@{ ccm_runner_verification = $true; status = "skipped"; verification = @(); failed = @(); results = @() } } else { Invoke-ProjectVerificationCommands -ProjectName $request.projectName -WorkDir $workDir }
    $agentResult.output = Add-RunnerVerificationOutput -Output $agentResult.output -RunnerVerification $runnerVerification
    $fileChanges = Get-FileChanges -WorkDir $workDir -Before $before
    $success = ($agentResult.exitCode -eq 0 -and $runnerVerification.status -ne "failed")
    Write-JsonAtomic -Path $resultFile -Data ([ordered]@{
      id = $request.id
      success = $success
      output = $agentResult.output
      error = $(if ($success) { "" } else { $agentResult.output })
      fileChanges = $fileChanges
      agentType = $agentType
      command = $commandLabelForResult
      cliAllowedTools = @($effectiveCliAllowedToolsArray)
      effectiveCliAllowedTools = $effectiveCliAllowedTools
      runnerVerification = $runnerVerification
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
      command = $commandLabelForResult
      cliAllowedTools = @($effectiveCliAllowedToolsArray)
      effectiveCliAllowedTools = $effectiveCliAllowedTools
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





