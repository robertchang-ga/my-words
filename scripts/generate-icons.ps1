Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '../public/icons'
New-Item -ItemType Directory -Force -Path $iconDirectory | Out-Null
foreach ($size in @(180, 192, 512)) {
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#164e49'))
    $cream = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#f7f5f0'))
    $teal = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#164e49'))
    $graphics.FillEllipse($cream, [single]($size*.21), [single]($size*.24), [single]($size*.58), [single]($size*.46))
    $points = [System.Drawing.PointF[]]@([System.Drawing.PointF]::new($size*.28,$size*.56),[System.Drawing.PointF]::new($size*.28,$size*.76),[System.Drawing.PointF]::new($size*.48,$size*.63))
    $graphics.FillPolygon($cream, $points)
    foreach ($offset in @(.35,.47,.59)) { $graphics.FillEllipse($teal,[single]($size*$offset),[single]($size*.44),[single]($size*.065),[single]($size*.065)) }
    $filename = if ($size -eq 180) { 'apple-touch-icon.png' } else { "icon-$size.png" }
    $bitmap.Save((Join-Path $iconDirectory $filename), [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose(); $bitmap.Dispose(); $cream.Dispose(); $teal.Dispose()
}
