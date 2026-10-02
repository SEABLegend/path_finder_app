Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\simha\.gemini\antigravity-ide\brain\6d38023e-9c7a-48ec-b035-52a2bf2ab05c\.user_uploaded\media_1790975463560.jpg"
$img = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Output "Source Image Size: $($img.Width) x $($img.Height)"

$c00 = $img.GetPixel(0, 0)
Write-Output "Pixel (0,0): R=$($c00.R) G=$($c00.G) B=$($c00.B)"
$cMid = $img.GetPixel([int]($img.Width / 2), [int]($img.Height / 2))
Write-Output "Pixel center: R=$($cMid.R) G=$($cMid.G) B=$($cMid.B)"

$img.Dispose()
