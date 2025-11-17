# Fix corrupted Java files
# This script removes duplicate package declarations and code appended to files

$files = @(
    "src\main\java\storebackend\controller\BrandKitController.java",
    "src\main\java\storebackend\controller\PublicCouponController.java",
    "src\main\java\storebackend\controller\StructuredDataController.java",
    "src\main\java\storebackend\dto\CouponUsageDTO.java",
    "src\main\java\storebackend\dto\seo\AssetUploadResponse.java",
    "src\main\java\storebackend\entity\CouponRedemption.java",
    "src\main\java\storebackend\entity\SeoAsset.java",
    "src\main\java\storebackend\repository\CouponRedemptionRepository.java",
    "src\main\java\storebackend\repository\SeoAssetRepository.java",
    "src\main\java\storebackend\service\seo\RedirectService.java",
    "src\main\java\storebackend\service\seo\SitemapService.java"
)

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    if (Test-Path $fullPath) {
        Write-Host "Fixing: $file" -ForegroundColor Yellow
        $content = Get-Content $fullPath -Raw

        # Find first closing brace that closes the main class
        $lines = Get-Content $fullPath
        $braceCount = 0
        $lastValidLine = 0

        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = $lines[$i]

            # Count braces
            $openBraces = ($line.ToCharArray() | Where-Object { $_ -eq '{' }).Count
            $closeBraces = ($line.ToCharArray() | Where-Object { $_ -eq '}' }).Count
            $braceCount += $openBraces - $closeBraces

            # If we've closed all braces and we're past the package declaration, this is likely the end
            if ($braceCount -eq 0 -and $i -gt 5) {
                $lastValidLine = $i
                break
            }
        }

        if ($lastValidLine -gt 0) {
            $validContent = $lines[0..$lastValidLine] -join "`n"
            Set-Content -Path $fullPath -Value $validContent -NoNewline
            Write-Host "✓ Fixed: $file (trimmed at line $lastValidLine)" -ForegroundColor Green
        } else {
            Write-Host "⚠ Could not determine valid end for: $file" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ File not found: $file" -ForegroundColor Red
    }
}

Write-Host "`nAll files processed!" -ForegroundColor Cyan

