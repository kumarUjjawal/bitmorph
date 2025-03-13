// app/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update dimensions when a new SVG is loaded
  useEffect(() => {
    if (svgUrl) {
      const getSVGDimensions = async () => {
        try {
          // Read the SVG file content
          if (!svgFile) return;

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
    }
  }, [svgUrl, svgFile]);

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
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

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

  return (
    <main className="min-h-screen p-4 md:p-8 bg-[#212121]">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">SVG to PNG Converter</h1>

        <div className="bg-gray-50 rounded-lg shadow-md p-6 mb-8">
          <div
            className="border-2 border-dashed border-gray-500 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
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
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg mb-2 text-black">Drag & drop your SVG file here</p>
                <p className="text-sm text-black">or click to browse</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-48 h-48 relative mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={svgUrl} alt="SVG Preview" className="max-w-full max-h-full object-contain" />
                </div>
                <p className="text-sm text-gray-500 mb-2">{svgFile?.name}</p>
                <button
                  className="text-blue-500 hover:text-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Choose a different file
                </button>
              </div>
            )}
          </div>
        </div>

        {svgUrl && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Output Settings</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="aspectRatio" className="ml-2 block text-sm text-gray-700">
                  Maintain aspect ratio
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
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

              <div className="text-xs text-gray-500">
                <p>Original dimensions: {originalWidth} × {originalHeight} pixels</p>
              </div>
            </div>

            <button
              className={`w-full py-3 px-4 rounded-lg text-white font-medium ${isConverting || pngUrl ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} transition-colors`}
              onClick={pngUrl ? handleDownload : convertToPng}
              disabled={isConverting}
            >
              {isConverting ?
                'Converting...' :
                pngUrl ? 'Download PNG' : 'Convert to PNG'
              }
            </button>

            {pngUrl && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Preview</h2>
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">SVG</h3>
                    <div className="border rounded-lg p-4 flex items-center justify-center bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={svgUrl} alt="SVG Preview" className="max-w-full max-h-48 object-contain" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">PNG ({parseInt(customWidth)}×{parseInt(customHeight)})</h3>
                    <div className="border rounded-lg p-4 flex items-center justify-center bg-gray-50">
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
