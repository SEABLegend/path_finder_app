Add-Type -AssemblyName System.Drawing

$srcFile = "c:\Users\simha\OneDrive\Desktop\projects\path-finder-app\src-tauri\icons\icon.png"
$outDir  = "c:\Users\simha\OneDrive\Desktop\projects\path-finder-app\src-tauri\icons"

$img = [System.Drawing.Bitmap]::FromFile($srcFile)

# 1. Detect tight bounding box of visible pixels
$minX = $img.Width; $maxX = 0; $minY = $img.Height; $maxY = 0

for ($y = 0; $y -lt $img.Height; $y++) {
    for ($x = 0; $x -lt $img.Width; $x++) {
        $p = $img.GetPixel($x, $y)
        if ($p.A -gt 15) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

$cropW = $maxX - $minX + 1
$cropH = $maxY - $minY + 1
Write-Output "Original Content Box: X=[$minX, $maxX], Y=[$minY, $maxY], Size=${cropW}x${cropH} on $($img.Width)x$($img.Height)"

# 2. Crop to tight content box
$cropRect = New-Object System.Drawing.Rectangle $minX, $minY, $cropW, $cropH
$cropped = $img.Clone($cropRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$img.Dispose()

# 3. Create a 1024x1024 master canvas where content fills ~95%
$targetDim = 1024
$padding = 24 # leave just 24px margin (2.3%) for glow anti-aliasing
$maxAvail = $targetDim - ($padding * 2)

$scale = [Math]::Min($maxAvail / $cropW, $maxAvail / $cropH)
$drawW = [int]($cropW * $scale)
$drawH = [int]($cropH * $scale)
$destX = [int](($targetDim - $drawW) / 2)
$destY = [int](($targetDim - $drawH) / 2)

$master = New-Object System.Drawing.Bitmap $targetDim, $targetDim, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($master)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)
$g.DrawImage($cropped, $destX, $destY, $drawW, $drawH)
$g.Dispose()
$cropped.Dispose()

Write-Output "Maximized content size: ${drawW}x${drawH} centered in ${targetDim}x${targetDim} canvas"

# 4. Helper to resize master
function Resize-Master($src, $w, $h, $destPath) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gr = [System.Drawing.Graphics]::FromImage($bmp)
    $gr.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gr.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gr.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gr.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $gr.Clear([System.Drawing.Color]::Transparent)
    $gr.DrawImage($src, 0, 0, $w, $h)
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $gr.Dispose()
    $bmp.Dispose()
}

$master.Save("$outDir\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$master.Save("$outDir\app-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
Resize-Master $master 256 256 "$outDir\128x128@2x.png"
Resize-Master $master 128 128 "$outDir\128x128.png"
Resize-Master $master 128 128 "$outDir\icon.icns"
Resize-Master $master 32 32 "$outDir\32x32.png"
Resize-Master $master 64 64 "c:\Users\simha\OneDrive\Desktop\projects\path-finder-app\public\app_icon.png"

# 5. Generate crisp multi-size .ico
$tmp48 = "$outDir\tmp48.png"
$tmp16 = "$outDir\tmp16.png"
Resize-Master $master 48 48 $tmp48
Resize-Master $master 16 16 $tmp16

$b256 = [System.IO.File]::ReadAllBytes("$outDir\128x128@2x.png")
$b128 = [System.IO.File]::ReadAllBytes("$outDir\128x128.png")
$b48  = [System.IO.File]::ReadAllBytes($tmp48)
$b32  = [System.IO.File]::ReadAllBytes("$outDir\32x32.png")
$b16  = [System.IO.File]::ReadAllBytes($tmp16)

$stream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter $stream

$count = 5
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]$count)

$offset = 6 + (16 * $count)

function Write-Entry($w, $h, $bytes, $writer, [ref]$off) {
    $writer.Write([Byte]($w -band 0xFF))
    $writer.Write([Byte]($h -band 0xFF))
    $writer.Write([Byte]0)
    $writer.Write([Byte]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]32)
    $writer.Write([UInt32]$bytes.Length)
    $writer.Write([UInt32]$off.Value)
    $off.Value += $bytes.Length
}

$offRef = [ref]$offset
Write-Entry 0 0 $b256 $writer $offRef
Write-Entry 128 128 $b128 $writer $offRef
Write-Entry 48 48 $b48 $writer $offRef
Write-Entry 32 32 $b32 $writer $offRef
Write-Entry 16 16 $b16 $writer $offRef

$writer.Write($b256)
$writer.Write($b128)
$writer.Write($b48)
$writer.Write($b32)
$writer.Write($b16)

[System.IO.File]::WriteAllBytes("$outDir\icon.ico", $stream.ToArray())
$writer.Dispose()
$stream.Dispose()
$master.Dispose()

Remove-Item -Path $tmp48, $tmp16 -Force -ErrorAction SilentlyContinue

Write-Output "Successfully generated maximized, full-bleed icon set!"
