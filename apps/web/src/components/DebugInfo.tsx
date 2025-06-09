'use client';

import React from 'react';

const DebugInfo: React.FC = () => {
  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleTestApi = async () => {
    console.log('API connection test started...');
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
      const testUrl = `${baseUrl}/courses`;
      
      console.log('Test URL:', testUrl);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API connection successful:', data);
        alert('API connection test successful!');
      } else {
        console.error('API connection failed:', response.statusText);
        alert(`API connection failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('API test error:', error);
      alert(`API test failed: ${error}`);
    }
  };

  const handleTestCourseEndpoint = async () => {
    const courseId = prompt('Enter course ID to test:');
    if (!courseId) return;
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
      const updateUrl = `${baseUrl}/courses/${courseId}`;
      
      console.log('Testing course update endpoint:', updateUrl);
      
      const optionsResponse = await fetch(updateUrl, {
        method: 'OPTIONS',
      });
      
      console.log('OPTIONS response:', {
        status: optionsResponse.status,
        headers: Object.fromEntries(optionsResponse.headers.entries()),
      });
      
      alert(`Course endpoint test result: ${optionsResponse.status}`);
    } catch (error) {
      console.error('Course endpoint test failed:', error);
      alert(`Course endpoint test failed: ${error}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 max-w-xs">
      <h3 className="text-sm font-bold mb-2">Debug Info</h3>
      <div className="text-xs space-y-1">
        <div>
          <strong>Environment:</strong> {process.env.NODE_ENV}
        </div>
        <div>
          <strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_BASE_URL || 'Default'}
        </div>
        <div>
          <strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.pathname : 'N/A'}
        </div>
      </div>
      <div className="space-y-2 mt-2">
        <button
          onClick={handleTestApi}
          className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
        >
          Test API Connection
        </button>
        <button
          onClick={handleTestCourseEndpoint}
          className="w-full px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors"
        >
          Test Course Endpoint
        </button>
      </div>
    </div>
  );
};

export default DebugInfo;
