"use client"
import React, { useState, useRef } from 'react';
import { Upload, FileText, DollarSign, TrendingUp } from 'lucide-react';

const CSVEarningsCalculator = () => {
  const [earnings, setEarnings] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    // Find column indices (case-insensitive)
    const paymentReceivedIndex = headers.findIndex(h =>
        h.toLowerCase().includes('payment received') || h.toLowerCase().includes('paymentreceived')
    );
    const paymentPendingIndex = headers.findIndex(h =>
        h.toLowerCase().includes('payment pending') || h.toLowerCase().includes('paymentpending')
    );
    const amountBonusedIndex = headers.findIndex(h =>
        h.toLowerCase().includes('amount bonused') || h.toLowerCase().includes('amountbonused')
    );

    if (paymentReceivedIndex === -1 || paymentPendingIndex === -1 || amountBonusedIndex === -1) {
      throw new Error('CSV must contain columns: Payment Received, Payment Pending, Amount Bonused');
    }

    let totalReceived = 0;
    let totalPending = 0;
    let totalBonused = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));

      const received = parseFloat(values[paymentReceivedIndex]) || 0;
      const pending = parseFloat(values[paymentPendingIndex]) || 0;
      const bonused = parseFloat(values[amountBonusedIndex]) || 0;

      totalReceived += received;
      totalPending += pending;
      totalBonused += bonused;
    }

    return {
      total: totalReceived + totalPending + totalBonused,
      breakdown: {
        received: totalReceived,
        pending: totalPending,
        bonused: totalBonused
      }
    };
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const result = parseCSV(text);
      setEarnings(result.total);
      setBreakdown(result.breakdown);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Today's Connect Earnings
            </h1>
            <p className="text-gray-600 text-lg">{getCurrentDate()}</p>
          </div>

          <div
              className={`border-3 border-dashed rounded-2xl p-12 mb-8 text-center transition-all duration-300 cursor-pointer hover:border-purple-500 hover:bg-purple-50 ${
                  isDragOver
                      ? 'border-green-500 bg-green-50'
                      : 'border-blue-400 bg-blue-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center">
              <Upload className="w-16 h-16 text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Upload Your CSV File
              </h3>
              <p className="text-gray-500 mb-4">
                Drag and drop your CSV file here, or click to browse
              </p>
              <p className="text-sm text-gray-400">
                CSV should contain: Payment Received, Payment Pending, Amount Bonused
              </p>
            </div>
          </div>

          <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
          />

          {isLoading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Processing your CSV file...</p>
              </div>
          )}

          {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  {error}
                </div>
              </div>
          )}

          {earnings !== null && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white transform transition-all duration-500 hover:scale-105">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <TrendingUp className="w-12 h-12" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">Total Earnings</h2>
                  <div className="text-5xl font-bold mb-6">
                    {formatCurrency(earnings)}
                  </div>

                  {breakdown && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="bg-white/20 rounded-lg p-4">
                          <h3 className="font-semibold mb-2">Payment Received</h3>
                          <p className="text-2xl font-bold">
                            {formatCurrency(breakdown.received)}
                          </p>
                        </div>
                        <div className="bg-white/20 rounded-lg p-4">
                          <h3 className="font-semibold mb-2">Payment Pending</h3>
                          <p className="text-2xl font-bold">
                            {formatCurrency(breakdown.pending)}
                          </p>
                        </div>
                        <div className="bg-white/20 rounded-lg p-4">
                          <h3 className="font-semibold mb-2">Amount Bonused</h3>
                          <p className="text-2xl font-bold">
                            {formatCurrency(breakdown.bonused)}
                          </p>
                        </div>
                      </div>
                  )}
                </div>
              </div>
          )}

          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>Upload a new CSV file to calculate updated earnings</p>
          </div>
        </div>
      </div>
  );
};

export default CSVEarningsCalculator;