$csharpCode = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Collections.Generic;

public class ImageProcessor2 {
    public static Bitmap Process(string srcPath) {
        using (Bitmap src = new Bitmap(srcPath)) {
            int w = src.Width;
            int h = src.Height;
            
            int targetDim = Math.Max(w, h);
            Bitmap dest = new Bitmap(targetDim, targetDim, PixelFormat.Format32bppArgb);
            
            int offsetX = (targetDim - w) / 2;
            int offsetY = (targetDim - h) / 2;
            
            BitmapData srcData = src.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppRgb);
            int[] srcPixels = new int[w * h];
            Marshal.Copy(srcData.Scan0, srcPixels, 0, srcPixels.Length);
            src.UnlockBits(srcData);
            
            // Step 1: Detect background region using BFS from outer image borders
            // Stop at the dark hexagon core (where max(r,g,b) < 130)
            bool[] isOutside = new bool[w * h];
            Queue<int> queue = new Queue<int>();
            
            for (int x = 0; x < w; x++) {
                queue.Enqueue(0 * w + x);
                queue.Enqueue((h - 1) * w + x);
                isOutside[0 * w + x] = true;
                isOutside[(h - 1) * w + x] = true;
            }
            for (int y = 0; y < h; y++) {
                queue.Enqueue(y * w + 0);
                queue.Enqueue(y * w + (w - 1));
                isOutside[y * w + 0] = true;
                isOutside[(y * w) + (w - 1)] = true;
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
                        if (!isOutside[nidx]) {
                            int rgb = srcPixels[nidx];
                            int r = (rgb >> 16) & 0xFF;
                            int g = (rgb >> 8) & 0xFF;
                            int b = rgb & 0xFF;
                            
                            // The hexagon body is dark gray / black (r, g, b < 100)
                            // We flood fill everything outside the dark hexagon interior
                            int maxChan = Math.Max(r, Math.Max(g, b));
                            int minChan = Math.Min(r, Math.Min(g, b));
                            
                            // Outside is white, light gray, or the outer mint border (where g is high and r,b are medium/high)
                            // Dark hexagon inside has maxChan < 100
                            if (maxChan > 90) {
                                isOutside[nidx] = true;
                                queue.Enqueue(nidx);
                            }
                        }
                    }
                }
            }
            
            int[] destPixels = new int[targetDim * targetDim];
            for (int i = 0; i < destPixels.Length; i++) destPixels[i] = 0;
            
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    int sidx = y * w + x;
                    int didx = (y + offsetY) * targetDim + (x + offsetX);
                    
                    int rgb = srcPixels[sidx];
                    int r = (rgb >> 16) & 0xFF;
                    int g = (rgb >> 8) & 0xFF;
                    int b = rgb & 0xFF;
                    
                    if (isOutside[sidx]) {
                        // Mathematical Color-To-Alpha against pure white (255, 255, 255)
                        // A = max(255 - R, 255 - G, 255 - B) / 255.0
                        int diffR = 255 - r;
                        int diffG = 255 - g;
                        int diffB = 255 - b;
                        int maxDiff = Math.Max(diffR, Math.Max(diffG, diffB));
                        
                        double alpha = maxDiff / 255.0;
                        
                        // Clean cutoff for faint noise in the background
                        if (alpha < 0.04) {
                            destPixels[didx] = 0;
                        } else {
                            // Unmultiply the white background to restore pure glow color!
                            int newR = (int)Math.Round((r - (1.0 - alpha) * 255.0) / alpha);
                            int newG = (int)Math.Round((g - (1.0 - alpha) * 255.0) / alpha);
                            int newB = (int)Math.Round((b - (1.0 - alpha) * 255.0) / alpha);
                            
                            newR = Math.Max(0, Math.Min(255, newR));
                            newG = Math.Max(0, Math.Min(255, newG));
                            newB = Math.Max(0, Math.Min(255, newB));
                            
                            int aInt = (int)Math.Round(alpha * 255.0);
                            destPixels[didx] = (aInt << 24) | (newR << 16) | (newG << 8) | newB;
                        }
                    } else {
                        // Inside the hexagon: 100% solid opaque
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
$outPng = "c:\Users\simha\OneDrive\Desktop\projects\path-finder-app\src-tauri\icons\test_transparent2.png"

$processed = [ImageProcessor2]::Process($src)
$processed.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
$processed.Dispose()

Write-Output "Processed image 2 saved to $outPng"
