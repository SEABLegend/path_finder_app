Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\simha\.gemini\antigravity-ide\brain\6d38023e-9c7a-48ec-b035-52a2bf2ab05c\app_logo_icon_1790974073846.jpg"
$outDir = "c:\Users\simha\OneDrive\Desktop\projects\path-finder-app\src-tauri\icons"

$srcImg = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image($src, $w, $h, $destPath, $format) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($src, 0, 0, $w, $h)
    $bmp.Save($destPath, $format)
    $g.Dispose()
    $bmp.Dispose()
}

Resize-Image $srcImg 1024 1024 "$outDir\icon.png" ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-Image $srcImg 1024 1024 "$outDir\app-icon.png" ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-Image $srcImg 256 256 "$outDir\128x128@2x.png" ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-Image $srcImg 128 128 "$outDir\128x128.png" ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-Image $srcImg 128 128 "$outDir\icon.icns" ([System.Drawing.Imaging.ImageFormat]::Png)
Resize-Image $srcImg 32 32 "$outDir\32x32.png" ([System.Drawing.Imaging.ImageFormat]::Png)

# Also update web public icon
Resize-Image $srcImg 64 64 "c:\Users\simha\OneDrive\Desktop\projects\path-finder-app\public\app_icon.png" ([System.Drawing.Imaging.ImageFormat]::Png)

$png256Bytes = [System.IO.File]::ReadAllBytes("$outDir\128x128@2x.png")
$png128Bytes = [System.IO.File]::ReadAllBytes("$outDir\128x128.png")
$png32Bytes  = [System.IO.File]::ReadAllBytes("$outDir\32x32.png")

$stream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter $stream

$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]3)

$offset = 6 + (16 * 3)

# Entry 1: 256x256
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]32)
$writer.Write([UInt32]$png256Bytes.Length)
$writer.Write([UInt32]$offset)
$offset += $png256Bytes.Length

# Entry 2: 128x128
$writer.Write([Byte]128)
$writer.Write([Byte]128)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]32)
$writer.Write([UInt32]$png128Bytes.Length)
$writer.Write([UInt32]$offset)
$offset += $png128Bytes.Length

# Entry 3: 32x32
$writer.Write([Byte]32)
$writer.Write([Byte]32)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]32)
$writer.Write([UInt32]$png32Bytes.Length)
$writer.Write([UInt32]$offset)

$writer.Write($png256Bytes)
$writer.Write($png128Bytes)
$writer.Write($png32Bytes)

[System.IO.File]::WriteAllBytes("$outDir\icon.ico", $stream.ToArray())
$writer.Dispose()
$stream.Dispose()
$srcImg.Dispose()

Write-Output "Successfully generated all modern icons!"
