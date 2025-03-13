'use client';

import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Download, Upload, Info } from 'lucide-react';

export default function Home() {
  const [svgFile, setSvgFile] = useState<File | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [originalWidth, setOriginalWidth] = useState<number>(0);
  const [originalHeight, setOriginalHeight] = useState<number>(0);
  const [customWidth, setCustomWidth] = useState<string>('');
  const [customHeight, setCustomHeight] = useState<string>('');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [quality, setQuality] = useState<number>(1);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [fileSize, setFileSize] = useState<string>('');
  const [recentFiles, setRecentFiles] = useState<{ name: string, date: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize recent files from localStorage
  useEffect(() => {
    const savedFiles = localStorage.getItem('recentSvgFiles');
    if (savedFiles) {
      setRecentFiles(JSON.parse(savedFiles));
    }
  }, []);

  // Update dimensions when a new SVG is loaded
  useEffect(() => {
    if (svgUrl && svgFile) {
      // Set file size
      const fileSizeKB = svgFile.size / 1024;
      setFileSize(
        fileSizeKB < 1024
          ? `${fileSizeKB.toFixed(2)} KB`
          : `${(fileSizeKB / 1024).toFixed(2)} MB`
      );

      const getSVGDimensions = async () => {
        try {
          // Read the SVG file content
          const svgText = await svgFile.text();

          // Parse the SVG dimensions
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
          const svgElement = svgDoc.documentElement;

          // Get SVG dimensions
          const svgWidth = svgElement.getAttribute('width');
          const svgHeight = svgElement.getAttribute('height');
          const viewBox = svgElement.getAttribute('viewBox');

          let width = 800; // Default width
          let height = 600; // Default height

          if (svgWidth && svgHeight) {
            width = parseFloat(svgWidth);
            height = parseFloat(svgHeight);
          } else if (viewBox) {
            const viewBoxValues = viewBox.split(' ').map(parseFloat);
            if (viewBoxValues.length === 4) {
              width = viewBoxValues[2];
              height = viewBoxValues[3];
            }
          }

          setOriginalWidth(width);
          setOriginalHeight(height);
          setCustomWidth(width.toString());
          setCustomHeight(height.toString());
        } catch (error) {
          console.error('Error getting SVG dimensions:', error);
        }
      };

      getSVGDimensions();

      // Add to recent files
      if (svgFile) {
        const newRecentFile = {
          name: svgFile.name,
          date: new Date().toLocaleString()
        };

        const updatedFiles = [newRecentFile, ...recentFiles.slice(0, 4)];
        setRecentFiles(updatedFiles);
        localStorage.setItem('recentSvgFiles', JSON.stringify(updatedFiles));
      }
    }
  }, [svgUrl, svgFile, recentFiles]);

  // Update height when width changes and maintain aspect ratio
  useEffect(() => {
    if (maintainAspectRatio && originalWidth && originalHeight && customWidth) {
      const aspectRatio = originalHeight / originalWidth;
      const newHeight = Math.round(parseFloat(customWidth) * aspectRatio);
      if (!isNaN(newHeight)) {
        setCustomHeight(newHeight.toString());
      }
    }
  }, [customWidth, maintainAspectRatio, originalWidth, originalHeight]);

  // Update width when height changes and maintain aspect ratio
  useEffect(() => {
    if (maintainAspectRatio && originalWidth && originalHeight && customHeight) {
      const aspectRatio = originalWidth / originalHeight;
      const newWidth = Math.round(parseFloat(customHeight) * aspectRatio);
      if (!isNaN(newWidth)) {
        setCustomWidth(newWidth.toString());
      }
    }
  }, [customHeight, maintainAspectRatio, originalWidth, originalHeight]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Check if the file is an SVG
      if (file.type !== 'image/svg+xml') {
        alert('Please upload an SVG file');
        return;
      }

      setSvgFile(file);

      // Create a URL for the SVG file
      const url = URL.createObjectURL(file);
      setSvgUrl(url);
      setPngUrl(null); // Reset PNG when a new SVG is uploaded
    }
  };

  const convertToPng = async () => {
    if (!svgUrl || !svgFile) return;

    setIsConverting(true);

    try {
      // Read the SVG file content
      const svgText = await svgFile.text();

      // Create a canvas with the specified dimensions
      const canvas = document.createElement('canvas');
      const width = parseInt(customWidth) || originalWidth;
      const height = parseInt(customHeight) || originalHeight;

      canvas.width = width;
      canvas.height = height;

      // Create a Blob URL with the SVG content
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      // Create a new image element
      const img = new Image();

      // Wait for the image to load before drawing to canvas
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => {
          console.error('Image loading error:', e);
          reject(new Error('Failed to load SVG image'));
        };

        // Set the source to the blob URL
        img.src = url;
      });

      // Draw the image on the canvas with the specified dimensions
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to PNG data URL with specified quality
      const pngDataUrl = canvas.toDataURL('image/png', quality);
      setPngUrl(pngDataUrl);

      // Clean up the blob URL
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error converting SVG to PNG:', error);
      alert('Failed to convert SVG to PNG. Error: ' + (error as Error).message);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!pngUrl) return;

    // Create a temporary anchor element
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `${svgFile?.name.replace('.svg', '') || 'converted'}_${customWidth}x${customHeight}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];

      if (file.type !== 'image/svg+xml') {
        alert('Please upload an SVG file');
        return;
      }

      setSvgFile(file);

      const url = URL.createObjectURL(file);
      setSvgUrl(url);
      setPngUrl(null);
    }
  };

  const estimatePngSize = (): string => {
    if (!customWidth || !customHeight) return '';

    const width = parseInt(customWidth);
    const height = parseInt(customHeight);
    // Rough estimation: width * height * 4 bytes (RGBA) * quality
    const estimatedBytes = width * height * 4 * quality;
    const estimatedKB = estimatedBytes / 1024;

    return estimatedKB < 1024
      ? `~${estimatedKB.toFixed(1)} KB`
      : `~${(estimatedKB / 1024).toFixed(1)} MB`;
  };


  // Determine theme class
  const themeClass = isDarkMode ? 'bg-[#212121] text-white' : 'bg-gray-100 text-gray-900';
  const cardClass = isDarkMode
    ? 'bg-gray-800 text-white border-gray-700'
    : 'bg-white text-gray-900 border-gray-200';

  return (
    <main className={`min-h-screen p-4 md:p-8 transition-colors ${themeClass}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">SVG to PNG Converter</h1>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-opacity-20 hover:bg-gray-500"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>

        <div className={`rounded-lg shadow-md p-6 mb-8 transition-colors ${cardClass}`}>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${isDragging
              ? 'border-blue-500 bg-blue-50 bg-opacity-10'
              : `border-gray-500 hover:border-blue-500 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`
              }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".svg"
              className="hidden"
            />

            {!svgUrl ? (
              <div>
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className={`text-lg mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Drag & drop your SVG file here
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  or click to browse
                </p>

                {recentFiles.length > 0 && (
                  <div className="mt-6">
                    <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Recent files:
                    </p>
                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {recentFiles.map((file, index) => (
                        <div key={index} className="mb-1">
                          {file.name} <span className="opacity-70">({file.date})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <div className="flex items-center justify-center overflow-hidden"
                    style={{ maxWidth: '100%', maxHeight: '200px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={svgUrl}
                      alt="SVG Preview"
                      className="object-contain transition-transform"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {svgFile?.name}
                  </p>
                  {fileSize && (
                    <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                      }`}>
                      {fileSize}
                    </span>
                  )}
                </div>
                <button
                  className={`text-blue-500 hover:text-blue-400 flex items-center gap-1`}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload size={14} />
                  Choose a different file
                </button>
              </div>
            )}
          </div>
        </div>

        {svgUrl && (
          <div className={`rounded-lg shadow-md p-6 mb-8 transition-colors ${cardClass}`}>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Output Settings</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Width (px)
                  </label>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700'
                      }`}
                    min="1"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Height (px)
                  </label>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700'
                      }`}
                    min="1"
                  />
                </div>
              </div>

              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="aspectRatio"
                  checked={maintainAspectRatio}
                  onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                />
                <label htmlFor="aspectRatio" className={`ml-2 block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Maintain aspect ratio
                </label>
              </div>

              <div className="mb-4">
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Quality: {Math.round(quality * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-400 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className={`text-xs mb-4 rounded-md p-3 flex items-start gap-2 ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p>Original dimensions: {originalWidth} × {originalHeight} pixels</p>
                  <p>Estimated PNG size: {estimatePngSize()}</p>
                </div>
              </div>
            </div>

            <button
              className={`w-full py-3 px-4 rounded-lg text-white font-medium flex items-center justify-center gap-2 ${isConverting
                ? 'bg-yellow-500 cursor-wait'
                : pngUrl
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors`}
              onClick={pngUrl ? handleDownload : convertToPng}
              disabled={isConverting}
            >
              {isConverting ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Converting...
                </>
              ) : pngUrl ? (
                <>
                  <Download size={20} />
                  Download PNG
                </>
              ) : (
                'Convert to PNG'
              )}
            </button>

            {pngUrl && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Preview</h2>
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1">
                    <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      SVG
                    </h3>
                    <div className={`border rounded-lg p-4 flex items-center justify-center ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                      }`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={svgUrl} alt="SVG Preview" className="max-w-full max-h-48 object-contain" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                      PNG ({parseInt(customWidth)}×{parseInt(customHeight)})
                    </h3>
                    <div className={`border rounded-lg p-4 flex items-center justify-center ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                      }`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pngUrl} alt="PNG Preview" className="max-w-full max-h-48 object-contain" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center text-sm text-gray-500">
          <p>Client-side conversion - your files are not uploaded to any server</p>
        </div>
      </div>
    </main>
  );
}
