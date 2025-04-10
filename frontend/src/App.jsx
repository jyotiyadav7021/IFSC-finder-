import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog } from '@headlessui/react';

function App() {
  const [file, setFile] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchIFSC, setSearchIFSC] = useState('');
  const [bankDetails, setBankDetails] = useState(null);
  const [modalData, setModalData] = useState(null);

  const fetchData = async () => {
    const res = await axios.get(`http://localhost:5000/api/data?page=${page}&limit=10`);
    setTableData(res.data.data);
    setTotal(res.data.total);
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  useEffect(() => {
    if (searchIFSC === '') fetchData();
  }, [searchIFSC]);

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    await axios.post('http://localhost:5000/api/upload', formData);
    fetchData();
  };

  const handleIFSCSearch = async () => {
    if (!searchIFSC) return;
    try {
      const res = await axios.get(`https://ifsc.razorpay.com/${searchIFSC}`);
      setBankDetails(res.data);
      await axios.post('http://localhost:5000/api/search', { ifsc: searchIFSC });
      const localRes = await axios.get(`http://localhost:5000/api/data?ifsc=${searchIFSC}`);
      setTableData(localRes.data.data);
      setTotal(localRes.data.data.length);
      setPage(1);
    } catch (error) {
      setBankDetails({ error: 'Invalid IFSC Code' });
      setTableData([]);
      setTotal(0);
    }
  };

  const exportRowToCSV = (row) => {
    const csvContent = `IFSC,BANK,BRANCH,ADDRESS,CITY,STATE\n"${row.IFSC}","${row.BANK}","${row.BRANCH}","${row.ADDRESS}","${row.CITY}","${row.STATE}"`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${row.IFSC}_details.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 to-blue-500 p-4 md:p-6 text-white font-sans">
      <h1 className="text-3xl md:text-5xl font-extrabold mb-6 text-center tracking-wide drop-shadow-md">
        IFSC Bank Finder
      </h1>

      {/* Upload Section */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 justify-center">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="w-full sm:w-auto file-input file-input-bordered bg-white text-black file:bg-gradient-to-r file:from-blue-600 file:to-indigo-600 file:text-white file:border-none file:rounded-md file:px-4 file:py-2 transition-all"
        />
        <button
          onClick={handleUpload}
          className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white px-6 py-2 rounded-xl shadow hover:shadow-xl"
        >
          Upload
        </button>
      </div>

      {/* IFSC Search Section */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 justify-center">
        <input
          type="text"
          placeholder="Enter IFSC Code"
          value={searchIFSC}
          onChange={(e) => setSearchIFSC(e.target.value)}
          className="px-4 py-2 w-full sm:w-64 rounded-md text-black border focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleIFSCSearch}
          className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white px-6 py-2 rounded-xl shadow hover:shadow-xl"
        >
          Search
        </button>
      </div>

      {/* IFSC Result */}
      {bankDetails && (
        <div className="bg-white/80 backdrop-blur-md text-black p-6 mb-8 rounded-xl shadow-2xl max-w-xl mx-auto border border-gray-200">
          {bankDetails.error ? (
            <p className="text-red-600">{bankDetails.error}</p>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-4 text-blue-800">🏦 Bank Details</h2>
              <p><strong>Bank:</strong> {bankDetails.BANK}</p>
              <p><strong>Branch:</strong> {bankDetails.BRANCH}</p>
              <p><strong>Address:</strong> {bankDetails.ADDRESS}</p>
              <p><strong>City:</strong> {bankDetails.CITY}</p>
              <p><strong>State:</strong> {bankDetails.STATE}</p>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto shadow-xl rounded-xl bg-white/70 backdrop-blur-md border border-gray-200">
        <table className="min-w-full text-sm text-left text-gray-800">
          <thead className="text-xs uppercase bg-white/90 text-gray-700 border-b">
            <tr>
              <th className="px-4 py-3">IFSC</th>
              <th className="px-4 py-3">Bank</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Export</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((item, idx) => (
              <tr
                key={idx}
                onClick={(e) => {
                  if (e.target.tagName.toLowerCase() !== 'button') setModalData(item);
                }}
                className="hover:bg-white/90 hover:shadow-md transition-all duration-200 border-b border-gray-100 cursor-pointer"
              >
                <td className="px-4 py-3 font-medium text-gray-900">{item.IFSC}</td>
                <td className="px-4 py-3">{item.BANK}</td>
                <td className="px-4 py-3">{item.BRANCH}</td>
                <td className="px-4 py-3">{item.CITY}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportRowToCSV(item);
                    }}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs"
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="bg-white text-gray-800 px-4 py-2 rounded-md shadow-md hover:bg-gray-100 disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-lg font-semibold">{`Page ${page}`}</span>
        <button
          disabled={page * 10 >= total}
          onClick={() => setPage((p) => p + 1)}
          className="bg-white text-gray-800 px-4 py-2 rounded-md shadow-md hover:bg-gray-100 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Modal */}
      {modalData && (
        <Dialog open={true} onClose={() => setModalData(null)} className="fixed z-50 inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Dialog.Panel className="bg-white p-6 rounded-lg max-w-md w-full text-black shadow-xl space-y-2">
            <Dialog.Title className="text-xl font-bold text-blue-700 mb-4">🔍 Bank Details</Dialog.Title>
            <p><strong>IFSC:</strong> {modalData.IFSC}</p>
            <p><strong>Bank:</strong> {modalData.BANK}</p>
            <p><strong>Branch:</strong> {modalData.BRANCH}</p>
            <p><strong>Address:</strong> {modalData.ADDRESS}</p>
            <p><strong>City:</strong> {modalData.CITY}</p>
            <p><strong>State:</strong> {modalData.STATE}</p>
            <button
              onClick={() => setModalData(null)}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md float-right"
            >
              Close
            </button>
          </Dialog.Panel>
        </Dialog>
      )}
    </div>
  );
}

export default App;
