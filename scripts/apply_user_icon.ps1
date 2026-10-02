Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\simha\OneDrive\Desktop\projects\path-finder-app\src-tauri\icons\test_transparent2.png"
$outDir = "c:\Users\simha\OneDrive\Desktop\projects\path-finder-app\src-tauri\icons"

$srcImg = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image($src, $w, $h, $destPath) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $w, $h)
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Resize-Image $srcImg 1024 1024 "$outDir\icon.png"
Resize-Image $srcImg 1024 1024 "$outDir\app-icon.png"
Resize-Image $srcImg 256 256 "$outDir\128x128@2x.png"
Resize-Image $srcImg 128 128 "$outDir\128x128.png"
Resize-Image $srcImg 128 128 "$outDir\icon.icns"
Resize-Image $srcImg 32 32 "$outDir\32x32.png"

# Also update web public icon
Resize-Image $srcImg 64 64 "c:\Users\simha\OneDrive\Desktop\projects\path-finder-app\public\app_icon.png"

# Generate high quality multi-resolution .ico (256, 128, 48, 32, 16)
$tmp48 = "$outDir\tmp48.png"
$tmp16 = "$outDir\tmp16.png"
Resize-Image $srcImg 48 48 $tmp48
Resize-Image $srcImg 16 16 $tmp16

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
Write-Entry 0 0 $b256 $writer $offRef # 0 means 256
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
$srcImg.Dispose()

Remove-Item -Path $tmp48, $tmp16 -Force -ErrorAction SilentlyContinue

Write-Output "Successfully generated custom transparent icons!"
