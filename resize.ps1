Add-Type -AssemblyName System.Drawing
$source = "C:\Users\SEBIN\.gemini\antigravity\brain\4c01a8d3-49ca-4df5-894b-3fcc34685c55\digital_hishob_khata_logo_1794129741802.jpg"
Copy-Item $source -Destination "public\icons\logo.jpg" -Force
Copy-Item $source -Destination "public\logo.jpg" -Force

$img = [System.Drawing.Image]::FromFile($source)

function Resize-And-Save($targetPath, $width, $height) {
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $width, $height)
    $g.Dispose()
    $bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

Resize-And-Save "public\icons\icon-192.png" 192 192
Resize-And-Save "public\icons\icon-512.png" 512 512
Resize-And-Save "public\icons\logo.png" 512 512
Resize-And-Save "public\logo.png" 512 512
Resize-And-Save "public\favicon.png" 64 64

$img.Dispose()
Write-Host "Logo assets generated successfully!"
Get-ChildItem -Recurse public

