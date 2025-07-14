"use client";
import React, { useState, useCallback } from 'react';
import { Upload, FileText, DollarSign, Calendar, Award, TrendingUp, AlertCircle, CheckCircle, X } from 'lucide-react';

const StudyEarningsCalculator = () => {
  const [studyData, setStudyData] = useState([]);
  const [conversionRate, setConversionRate] = useState(1.25);
  const [results, setResults] = useState(null);
  const [validStudies, setValidStudies] = useState([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const showError = (message) => {
    setError(message);
    setInfo('');
  };

  const showInfo = (message) => {
    setInfo(message);
    setError('');
  };

  const hideMessages = () => {
    setError('');
    setInfo('');
  };

  // Manual CSV parser function (no external library needed)
  const parseCSVManually = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }

    return data;
  };

  const parseCSV = useCallback((file) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsedData = parseCSVManually(text);
        
        // Clean up headers by trimming whitespace
        const cleanedData = parsedData.map(row => {
          const cleanRow = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.trim();
            cleanRow[cleanKey] = row[key];
          });
          return cleanRow;
        });
        
        setStudyData(cleanedData);
        hideMessages();
        showInfo(`✅ CSV file loaded successfully! Found ${cleanedData.length} studies.`);
      } catch (error) {
        showError('Error parsing CSV: ' + error.message);
      }
    };

    reader.onerror = () => {
      showError('Error reading file. Please try again.');
    };

    reader.readAsText(file);
  }, []);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        parseCSV(file);
      } else {
        showError('Please upload a CSV file.');
      }
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        parseCSV(file);
      } else {
        showError('Please upload a CSV file.');
      }
    }
  };

  // Add this helper above isStudyStartedToday
  const parseDateFlexible = (dateStr) => {
    // Try native Date first
    let parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;

    // Try DD/MM/YYYY HH:mm or DD/MM/YYYY
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (match) {
      const [, d, m, y, h = '0', min = '0'] = match;
      return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${min.padStart(2, '0')}:00`);
    }
    // Try MM/DD/YYYY HH:mm or MM/DD/YYYY
    const matchUS = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (matchUS) {
      const [, m, d, y, h = '0', min = '0'] = matchUS;
      return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${min.padStart(2, '0')}:00`);
    }
    return null;
  };

  const isStudyStartedToday = (study, todayDateString) => {
    const startedAt = study['Started At'];
    if (!startedAt || startedAt.toString().trim() === '') {
      return false;
    }
    const startedAtStr = startedAt.toString().trim();
    let parsedDate = new Date(startedAtStr);
    if (isNaN(parsedDate.getTime())) {
      parsedDate = parseDateFlexible(startedAtStr);
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        return false;
      }
    }
    const studyDateString = parsedDate.toISOString().split('T')[0];
    return studyDateString === todayDateString;
  };

  const calculateEarnings = () => {
    if (!studyData || studyData.length === 0) {
      showError('Please upload a CSV file first.');
      return;
    }

    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0];
    
    // Filter studies started today with valid statuses
    const validStudiesFiltered = studyData.filter(study => {
      const status = (study.Status || '').toString().toUpperCase().trim();
      
      const isValidStatus = status !== 'TIMED-OUT' && 
                          status !== 'RETURNED' && 
                          status !== 'REJECTED' &&
                          status !== '';
      
      const isStartedToday = isStudyStartedToday(study, todayDateString);
      
      return isValidStatus && isStartedToday;
    });

    let totalUSDRewards = 0;
    let totalGBPRewards = 0;
    let totalUSDBonuses = 0;
    let totalGBPBonuses = 0;

    validStudiesFiltered.forEach(study => {
      const reward = parseFloat((study.Reward || '0').toString().replace(/[£$,]/g, '')) || 0;
      const bonus = parseFloat((study.Bonus || '0').toString().replace(/[£$,]/g, '')) || 0;
      const rewardStr = (study.Reward || '').toString();
      const bonusStr = (study.Bonus || '').toString();

      if (rewardStr.includes('£')) {
        totalGBPRewards += reward;
      } else if (rewardStr.includes('$')) {
        totalUSDRewards += reward;
      }

      if (bonusStr.includes('£')) {
        totalGBPBonuses += bonus;
      } else if (bonusStr.includes('$')) {
        totalUSDBonuses += bonus;
      }
    });

    const totalUSDFromGBP = (totalGBPRewards + totalGBPBonuses) * conversionRate;
    const totalEarningsUSD = totalUSDRewards + totalUSDBonuses + totalUSDFromGBP;

    const calculatedResults = {
      totalStudies: studyData.length,
      validStudies: validStudiesFiltered.length,
      usdRewards: totalUSDRewards,
      gbpRewards: totalGBPRewards,
      usdBonuses: totalUSDBonuses,
      gbpBonuses: totalGBPBonuses,
      totalEarnings: totalEarningsUSD
    };

    setResults(calculatedResults);
    setValidStudies(validStudiesFiltered);
    
    if (validStudiesFiltered.length === 0) {
      showInfo('No valid studies found that were started today. This could be because:\n- No studies were started today\n- All studies have invalid statuses (TIMED-OUT, RETURNED, REJECTED)\n- The "Started At" column is missing or has invalid dates');
    } else {
      showInfo(`Found ${validStudiesFiltered.length} valid studies started today.`);
    }
  };

  const getStatusBadgeColor = (status) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('approved')) return 'bg-green-100 text-green-800';
    if (statusLower.includes('awaiting')) return 'bg-yellow-100 text-yellow-800';
    if (statusLower.includes('returned') || statusLower.includes('rejected') || statusLower.includes('timed')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-800 p-4">
      {/* Header with navigation */}
      <div className="absolute top-0 left-0 w-full flex justify-between items-center px-8 py-5 bg-white/80 backdrop-blur-md shadow-md z-10">
        <div className="text-2xl font-bold text-indigo-700 tracking-tight">Daily Earnings</div>
        <nav className="flex gap-8">
          <a
            href="/"
            className="text-lg font-medium text-indigo-700 hover:text-purple-700 transition-colors"
          >
            Connect
          </a>
          <a
            href="/prolific"
            className="text-lg font-medium text-indigo-700 hover:text-purple-700 transition-colors"
          >
            Prolific
          </a>
        </nav>
      </div>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mt-24">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Prolific Study Earnings Calculator
            </h1>
            <p className="text-gray-600">Calculate your daily study earnings with precision</p>
          </div>

          {/* Upload Section */}
          <div 
            className={`border-2 border-dashed rounded-2xl p-8 text-center mb-8 transition-all duration-300 ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-50 scale-105' 
                : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleFileDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Upload Your CSV File</h2>
            <p className="text-gray-600 mb-4">Drag and drop your CSV file here or click to select</p>
            <label className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-medium cursor-pointer hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 hover:scale-105 shadow-lg">
              <FileText className="mr-2 h-5 w-5" />
              Choose CSV File
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">Will calculate earnings for studies started today only</p>
          </div>

          {/* Conversion Section */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  £ to $ Conversion Rate
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={conversionRate}
                    onChange={(e) => setConversionRate(parseFloat(e.target.value) || 1.25)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-black"
                    placeholder="Enter conversion rate"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Current rate: 1 GBP = {conversionRate} USD</p>
              </div>
              <div className="flex justify-center md:justify-end">
                <button
                  onClick={calculateEarnings}
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Calculate Today's Earnings
                </button>
              </div>
            </div>
          </div>

          {/* Error/Info Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
              <button onClick={hideMessages} className="ml-auto text-red-500 hover:text-red-700">
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {info && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center">
              <CheckCircle className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
              <p className="text-blue-800 whitespace-pre-line">{info}</p>
              <button onClick={hideMessages} className="ml-auto text-blue-500 hover:text-blue-700">
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Results Section */}
          {results && (
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-8 mb-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <h3 className="text-sm opacity-80 mb-2">Total Studies</h3>
                  <div className="text-2xl font-bold">{results.totalStudies}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <h3 className="text-sm opacity-80 mb-2">Today's Valid Studies</h3>
                  <div className="text-2xl font-bold">{results.validStudies}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <h3 className="text-sm opacity-80 mb-2">USD Rewards</h3>
                  <div className="text-2xl font-bold">${results.usdRewards.toFixed(2)}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <h3 className="text-sm opacity-80 mb-2">GBP Rewards</h3>
                  <div className="text-2xl font-bold">£{results.gbpRewards.toFixed(2)}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <h3 className="text-sm opacity-80 mb-2">USD Bonuses</h3>
                  <div className="text-2xl font-bold">${results.usdBonuses.toFixed(2)}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                  <h3 className="text-sm opacity-80 mb-2">GBP Bonuses</h3>
                  <div className="text-2xl font-bold">£{results.gbpBonuses.toFixed(2)}</div>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
                <h2 className="text-lg mb-2 flex items-center justify-center">
                  <Award className="mr-2 h-6 w-6" />
                  Today's Total Earnings (USD)
                </h2>
                <div className="text-4xl font-bold">${results.totalEarnings.toFixed(2)}</div>
              </div>
            </div>
          )}

          {/* Studies Table */}
          {validStudies.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b">
                <h2 className="text-xl font-semibold flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Today's Valid Studies
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-indigo-600 text-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium">Study</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Reward</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Bonus</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Completion Code</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Started At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {validStudies.map((study, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {study.Study || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {study.Reward || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {study.Bonus || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(study.Status || '')}`}>
                            {study.Status || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {study['Completion Code'] || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {study['Started At'] || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyEarningsCalculator;