$csharpCode = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Collections.Generic;

public class ImageProcessor {
    public static Bitmap Process(string srcPath) {
        using (Bitmap src = new Bitmap(srcPath)) {
            int w = src.Width;
            int h = src.Height;
            
            // Create a square 1024x1024 canvas
            int targetDim = Math.Max(w, h);
            Bitmap dest = new Bitmap(targetDim, targetDim, PixelFormat.Format32bppArgb);
            
            // Calculate centering offset
            int offsetX = (targetDim - w) / 2;
            int offsetY = (targetDim - h) / 2;
            
            // Lock src bits
            BitmapData srcData = src.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppRgb);
            int[] srcPixels = new int[w * h];
            Marshal.Copy(srcData.Scan0, srcPixels, 0, srcPixels.Length);
            src.UnlockBits(srcData);
            
            // Find all background pixels using BFS starting from outer borders
            bool[] isBg = new bool[w * h];
            Queue<int> queue = new Queue<int>();
            
            for (int x = 0; x < w; x++) {
                queue.Enqueue(0 * w + x);
                queue.Enqueue((h - 1) * w + x);
                isBg[0 * w + x] = true;
                isBg[(h - 1) * w + x] = true;
            }
            for (int y = 0; y < h; y++) {
                queue.Enqueue(y * w + 0);
                queue.Enqueue(y * w + (w - 1));
                isBg[y * w + 0] = true;
                isBg[y * w + (w - 1)] = true;
            }
            
            int[] dx = { 1, -1, 0, 0 };
            int[] dy = { 0, 0, 1, -1 };
            
            while (queue.Count > 0) {
                int curr = queue.Dequeue();
                int cx = curr % w;
                int cy = curr / w;
                
                for (int i = 0; i < 4; i++) {
                    int nx = cx + dx[i];
                    int ny = cy + dy[i];
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                        int nidx = ny * w + nx;
                        if (!isBg[nidx]) {
                            int rgb = srcPixels[nidx];
                            int r = (rgb >> 16) & 0xFF;
                            int g = (rgb >> 8) & 0xFF;
                            int b = rgb & 0xFF;
                            
                            // Hexagon inside is dark (r,g,b < 150) or neon arrows.
                            // The outer glow/white background has high brightness (r,g,b > 210)
                            int minChan = Math.Min(r, Math.Min(g, b));
                            if (minChan > 215) {
                                isBg[nidx] = true;
                                queue.Enqueue(nidx);
                            }
                        }
                    }
                }
            }
            
            // Build destination pixels
            int[] destPixels = new int[targetDim * targetDim];
            // Initialize with transparent
            for (int i = 0; i < destPixels.Length; i++) destPixels[i] = 0;
            
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    int sidx = y * w + x;
                    int didx = (y + offsetY) * targetDim + (x + offsetX);
                    
                    int rgb = srcPixels[sidx];
                    int r = (rgb >> 16) & 0xFF;
                    int g = (rgb >> 8) & 0xFF;
                    int b = rgb & 0xFF;
                    
                    if (isBg[sidx]) {
                        // Smoothly fade out near pure white
                        int minChan = Math.Min(r, Math.Min(g, b));
                        if (minChan >= 250) {
                            destPixels[didx] = 0; // completely transparent
                        } else {
                            // Feathered alpha transition between 215 and 250
                            double t = 1.0 - ((minChan - 215.0) / (250.0 - 215.0));
                            if (t < 0) t = 0;
                            if (t > 1) t = 1;
                            int alpha = (int)(t * 255.0);
                            destPixels[didx] = (alpha << 24) | (r << 16) | (g << 8) | b;
                        }
                    } else {
                        // Solid foreground pixel (inside the hexagon and the glowing border)
                        destPixels[didx] = (255 << 24) | (r << 16) | (g << 8) | b;
                    }
                }
            }
            
            BitmapData destData = dest.LockBits(new Rectangle(0, 0, targetDim, targetDim), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
            Marshal.Copy(destPixels, 0, destData.Scan0, destPixels.Length);
            dest.UnlockBits(destData);
            
            return dest;
        }
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies "System.Drawing.dll"

$src = "C:\Users\simha\.gemini\antigravity-ide\brain\6d38023e-9c7a-48ec-b035-52a2bf2ab05c\.user_uploaded\media_1790975463560.jpg"
$outPng = "c:\Users\simha\OneDrive\Desktop\projects\path-finder-app\src-tauri\icons\test_transparent.png"

$processed = [ImageProcessor]::Process($src)
$processed.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
$processed.Dispose()

Write-Output "Processed image saved to $outPng"
