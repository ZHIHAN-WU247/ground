Set-Location -LiteralPath "D:\GROUND"

$envFiles = @(".env.local", "apps\api\.env.local")

foreach ($envFile in $envFiles) {
  if (-not (Test-Path -LiteralPath $envFile)) {
    continue
  }

  Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_.Trim()

    if ($line -and -not $line.StartsWith("#")) {
      $idx = $line.IndexOf("=")

      if ($idx -gt 0) {
        $key = $line.Substring(0, $idx).Trim()
        $value = $line.Substring($idx + 1).Trim() -replace '^[\"'']|[\"'']$', ''
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
      }
    }
  }
}

npm.cmd run dev:api
