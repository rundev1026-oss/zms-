Add-Type -AssemblyName System.Drawing
function Show-Page($path, $ys) {
  $bmp = New-Object System.Drawing.Bitmap $path
  Write-Output ("FILE " + $path)
  foreach ($ypt in $ys) {
    $xs = New-Object System.Collections.Generic.List[int]
    $center = $ypt * 2
    for ($x = 60; $x -lt 1190; $x += 2) {
      $n = 0
      for ($dy = -16; $dy -le 4; $dy += 2) {
        $py = $center + $dy
        if ($py -lt 0 -or $py -ge $bmp.Height) { continue }
        $c = $bmp.GetPixel($x, $py)
        $lum = $c.R * 0.3 + $c.G * 0.59 + $c.B * 0.11
        if ($lum -lt 130) { $n++ }
      }
      if ($n -ge 2) { $xs.Add([int]($x/2)) }
    }
    $segs = New-Object System.Collections.Generic.List[string]
    if ($xs.Count -gt 0) {
      $a = $xs[0]; $b = $xs[0]
      for ($i = 1; $i -lt $xs.Count; $i++) {
        if ($xs[$i] - $b -le 10) { $b = $xs[$i] }
        else { if (($b - $a) -ge 10) { $segs.Add("$a-$b") }; $a = $xs[$i]; $b = $xs[$i] }
      }
      if (($b - $a) -ge 10) { $segs.Add("$a-$b") }
    }
    Write-Output ("{0}: {1}" -f $ypt, ($(if ($segs.Count) { $segs -join " " } else { "none" })))
  }
  $bmp.Dispose()
}
Show-Page "C:\Users\mukhl\Documents\GitHub\zms-\tmp\form-pages\page-2.png" @(109,151,177,190,210,239,264,282,301,319,337,356,386,411,437,458,506,520,541)
Show-Page "C:\Users\mukhl\Documents\GitHub\zms-\tmp\form-pages\page-3.png" @(91,117,137,159,180,216,237,258,279,300,321,342,369,384,405,460,481,507,528,543,570,622,683,706,725)
