# ---------------------------------------------------------
# Cart validation tests — requires $token to be set
# ---------------------------------------------------------
if (-not $token) {
  Write-Host "Token is not set. Log in first." -ForegroundColor Red
  exit 1
}

$base      = "http://localhost:5000/api/cart"
$headers   = @{ Authorization = "Bearer $token" }
$productId = "cmuxtuk1k0000v3ngu1nhohxs"

function Test-Cart {
  param(
    [string]$name,
    [string]$configJson
  )
  Write-Host ""
  Write-Host "=== $name ===" -ForegroundColor Cyan

  # Build the full body as a hashtable and let ConvertTo-Json handle the encoding
  $fullObj = @{
    productId     = $productId
    quantity      = 1
    configuration = ($configJson | ConvertFrom-Json)
  }
  $body = $fullObj | ConvertTo-Json -Depth 10 -Compress

  try {
    $result = Invoke-RestMethod -Uri $base -Method Post `
      -Headers $headers -ContentType "application/json" -Body $body
    Write-Host "  OK" -ForegroundColor Green
    if ($result.item.lockedPrice) {
      Write-Host "  lockedPrice: $($result.item.lockedPrice)"
    }
  } catch {
    Write-Host "  REJECTED" -ForegroundColor Yellow
    Write-Host "  $($_.ErrorDetails.Message)"
  }
}

# ---- Test configs ----

$cfgValid = '{"version":3,"hand":"right","rings":[{"finger":"index","size":"size_7","karat":22},{"finger":"middle","size":"size_7","karat":22}],"medallion":{"enabled":true,"styleKey":"kundan"},"bracelet":{"size":"6.5_inch"}}'

$cfgMissingFinger = '{"version":3,"rings":[{"size":"size_7","karat":22}],"bracelet":{"size":"6.5_inch"}}'

$cfgDuplicateFinger = '{"version":3,"rings":[{"finger":"index","size":"size_7","karat":22},{"finger":"index","size":"size_8","karat":22}],"bracelet":{"size":"6.5_inch"}}'

$cfgInvalidFinger = '{"version":3,"rings":[{"finger":"left_index","size":"size_7","karat":22}],"bracelet":{"size":"6.5_inch"}}'

$cfgMedallionNoStyle = '{"version":3,"rings":[{"finger":"index","size":"size_7","karat":22}],"medallion":{"enabled":true},"bracelet":{"size":"6.5_inch"}}'

$cfgMedallionUnknown = '{"version":3,"rings":[{"finger":"index","size":"size_7","karat":22}],"medallion":{"enabled":true,"styleKey":"unicorn"},"bracelet":{"size":"6.5_inch"}}'

$cfgNoBracelet = '{"version":3,"rings":[{"finger":"index","size":"size_7","karat":22}],"bracelet":{}}'

$cfgLegacy = '{"ring":"size_7","bridge":"5.0_inch","bracelet":"6.5_inch"}'

# ---- Run ----

Test-Cart "Valid v3 config"            $cfgValid
Test-Cart "Missing finger"             $cfgMissingFinger
Test-Cart "Duplicate finger"           $cfgDuplicateFinger
Test-Cart "Invalid finger name"        $cfgInvalidFinger
Test-Cart "Medallion without styleKey" $cfgMedallionNoStyle
Test-Cart "Unknown medallion style"    $cfgMedallionUnknown
Test-Cart "Missing bracelet size"      $cfgNoBracelet
Test-Cart "Legacy v1 config"           $cfgLegacy