// app/page.tsx
'use client';

import { useState, useRef } from 'react';
// Removed the Image import from next/image

export default function Home() {
  const [svgFile, setSvgFile] = useState<File | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // Parse the SVG dimensions
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgElement = svgDoc.documentElement;

      // Get SVG dimensions
      const svgWidth = svgElement.getAttribute('width');
      const svgHeight = svgElement.getAttribute('height');
      const viewBox = svgElement.getAttribute('viewBox');

      // Calculate dimensions for the canvas
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

      // Create a canvas with the appropriate dimensions
      const canvas = document.createElement('canvas');
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

      // Draw the image on the canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to PNG data URL
      const pngDataUrl = canvas.toDataURL('image/png');
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
    a.download = `${svgFile?.name.replace('.svg', '') || 'converted'}.png`;
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
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">SVG to PNG Converter</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
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
                <p className="text-lg mb-2">Drag & drop your SVG file here</p>
                <p className="text-sm text-gray-500">or click to browse</p>
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
                    <h3 className="text-sm font-medium text-gray-500 mb-2">PNG</h3>
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
