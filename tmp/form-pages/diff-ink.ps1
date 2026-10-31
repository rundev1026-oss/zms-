Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class InkDiff {
  public static string Boxes(string blankPath, string filledPath) {
    using (var blank = new Bitmap(blankPath))
    using (var filled = new Bitmap(filledPath)) {
      int w = Math.Min(blank.Width, filled.Width);
      int h = Math.Min(blank.Height, filled.Height);
      var br = new Rectangle(0, 0, blank.Width, blank.Height);
      var fr = new Rectangle(0, 0, filled.Width, filled.Height);
      var bd = blank.LockBits(br, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      var fd = filled.LockBits(fr, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      int bStride = bd.Stride;
      int fStride = fd.Stride;
      byte[] bBytes = new byte[bStride * blank.Height];
      byte[] fBytes = new byte[fStride * filled.Height];
      Marshal.Copy(bd.Scan0, bBytes, 0, bBytes.Length);
      Marshal.Copy(fd.Scan0, fBytes, 0, fBytes.Length);
      blank.UnlockBits(bd);
      filled.UnlockBits(fd);
      var marks = new System.Collections.Generic.List<string>();
      bool[,] ink = new bool[w, h];
      for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
          int bi = y * bStride + x * 4;
          int fi = y * fStride + x * 4;
          int bl = bBytes[bi] + bBytes[bi+1] + bBytes[bi+2];
          int fl = fBytes[fi] + fBytes[fi+1] + fBytes[fi+2];
          if (bl > 680 && fl < 520) ink[x, y] = true;
        }
      }
      bool[,] seen = new bool[w, h];
      for (int y = 0; y < h; y += 2) {
        for (int x = 0; x < w; x += 2) {
          if (!ink[x, y] || seen[x, y]) continue;
          int minX = x, maxX = x, minY = y, maxY = y, count = 0;
          var stack = new System.Collections.Generic.Stack<int>();
          stack.Push(y * w + x);
          seen[x, y] = true;
          while (stack.Count > 0 && count < 8000) {
            int p = stack.Pop();
            int cx = p % w;
            int cy = p / w;
            count++;
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;
            for (int dy = -2; dy <= 2; dy += 2) {
              for (int dx = -2; dx <= 2; dx += 2) {
                int nx = cx + dx, ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[nx, ny] || !ink[nx, ny]) continue;
                seen[nx, ny] = true;
                stack.Push(ny * w + nx);
              }
            }
          }
          if (count > 8) marks.Add(minX + "," + minY + "," + maxX + "," + maxY + "," + count);
        }
      }
      return string.Join("\n", marks);
    }
  }
}
"@

$scale = 595.28 / 612
$offset = (841.89 - 792 * $scale) / 2
function Convert-Box($line) {
  $p = $line.Split(',')
  $x1 = [math]::Round(([double]$p[0] / 2 - 0) / $scale, 1)
  $y1 = [math]::Round(([double]$p[1] / 2 - $offset) / $scale, 1)
  $x2 = [math]::Round(([double]$p[2] / 2) / $scale, 1)
  $y2 = [math]::Round(([double]$p[3] / 2 - $offset) / $scale, 1)
  return ("{0}-{1} x {2}-{3} n={4}" -f $x1, $x2, $y1, $y2, $p[4])
}

foreach ($n in 1,2,3) {
  Write-Output "PAGE $n"
  $raw = [InkDiff]::Boxes("C:\Users\mukhl\Documents\GitHub\zms-\tmp\form-pages\blank-$n.png", "C:\Users\mukhl\Documents\GitHub\zms-\tmp\form-pages\filled-$n.png")
  $raw -split "`n" | Where-Object { $_ } | ForEach-Object { Convert-Box $_ }
}
