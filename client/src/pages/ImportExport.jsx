import React, { useState } from 'react';
import { api, downloadFile } from '../services/api';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Laptop,
  Users,
} from 'lucide-react';

/**
 * Bulk Data Import & Export Engine Page
 * Facilitates migrating 400+ campus laptops from spreadsheets into MySQL with duplicate validation,
 * bulk student/fee imports, and official institutional Excel (.xlsx) exports.
 */
export const ImportExport = () => {
  // Upload file state
  const [laptopFile, setLaptopFile] = useState(null);
  const [studentFile, setStudentFile] = useState(null);

  // Result reports
  const [laptopResult, setLaptopResult] = useState(null);
  const [studentResult, setStudentResult] = useState(null);

  // Loading indicators
  const [uploadingLaptops, setUploadingLaptops] = useState(false);
  const [uploadingStudents, setUploadingStudents] = useState(false);

  // Generate downloadable sample CSV template for laptop inventory
  const handleDownloadSampleLaptopCSV = () => {
    const csvContent =
      'Asset Tag,Serial Number,Make,Model,Processor,RAM,Storage,Charger Serial,Department\n' +
      'CLG-LAP-101,SN-DELL-88211,Dell,Latitude 3420,Intel Core i5-1135G7,16GB DDR4,512GB SSD,CHG-88211,IT Excellence Group\n' +
      'CLG-LAP-102,SN-LEN-88212,Lenovo,ThinkPad E14,AMD Ryzen 5 5625U,16GB DDR4,512GB SSD,CHG-88212,Bachelor of Technology\n' +
      'CLG-LAP-103,SN-HP-88213,HP,ProBook 440 G8,Intel Core i5-1135G7,8GB DDR4,256GB SSD,CHG-88213,Management Excellence Group';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SSISM_Laptops_Sample_Template.csv';
    a.click();
  };

  const handleDownloadSampleLaptopExcel = () => {
    downloadFile('/data/template/assets', 'SSISM_Laptops_Sample_Template.xlsx');
  };

  // Generate downloadable sample CSV template for student registration
  const handleDownloadSampleStudentCSV = () => {
    const csvContent =
      'Name,Email,Roll Number,Department,Batch,Fee Status,Fee Amount\n' +
      'Devansh Gupta,st.devansh@ssism.edu,2025/099,IT Excellence Group,2024-2028,PAID,1500\n' +
      'Ishita Rathi,st.ishita@ssism.edu,2025/088,Management Excellence Group,2024-2028,UNPAID,1500\n' +
      'Nikhil Jain,st.nikhil@ssism.edu,24BT077,Bachelor of Technology,2024-2028,PAID,1500';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SSISM_Students_Sample_Template.csv';
    a.click();
  };

  const handleDownloadSampleStudentExcel = () => {
    downloadFile('/data/template/students', 'SSISM_Students_Sample_Template.xlsx');
  };

  // Submit bulk laptop CSV to backend API
  const handleUploadLaptops = async (e) => {
    e.preventDefault();
    if (!laptopFile) return;

    setUploadingLaptops(true);
    setLaptopResult(null);

    const formData = new FormData();
    formData.append('file', laptopFile);

    try {
      const res = await api.post('/data/import/assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLaptopResult(res.data);
      setLaptopFile(null);
    } catch (err) {
      setLaptopResult({
        success: false,
        error: err.response?.data?.message || 'Failed to parse and import laptop CSV.',
      });
    } finally {
      setUploadingLaptops(false);
    }
  };

  // Submit bulk student CSV to backend API
  const handleUploadStudents = async (e) => {
    e.preventDefault();
    if (!studentFile) return;

    setUploadingStudents(true);
    setStudentResult(null);

    const formData = new FormData();
    formData.append('file', studentFile);

    try {
      const res = await api.post('/data/import/students', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStudentResult(res.data);
      setStudentFile(null);
    } catch (err) {
      setStudentResult({
        success: false,
        error: err.response?.data?.message || 'Failed to parse and import students CSV.',
      });
    } finally {
      setUploadingStudents(false);
    }
  };

  // Export handlers
  const handleExportLaptops = () => {
    downloadFile('/data/export/assets', 'SSISM_Laptops_Inventory.xlsx');
  };

  const handleExportAllocations = () => {
    downloadFile('/data/export/allocations', 'SSISM_Allocation_Ledger.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Bulk Data Import & Institutional Export Engine
        </h1>
      </div>

      {/* Export Section: Pure white rounded-xl container */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
          <Download className="w-4 h-4 text-[#F26522]" />
          <span>Institutional Excel Exports (.xlsx)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Laptops Catalog Export */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Campus Laptops & Hardware Catalog</h3>
            </div>
            <button
              onClick={handleExportLaptops}
              className="px-3.5 py-2 bg-[#F26522] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition flex items-center space-x-1.5 flex-shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>

          {/* Allocations History Export */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Allocation Lifecycle Ledger</h3>
            </div>
            <button
              onClick={handleExportAllocations}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center space-x-1.5 flex-shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Import Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bulk Laptop Import */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
              <Laptop className="w-4 h-4 text-[#F26522]" />
              <span>Bulk 400+ Laptop CSV Import</span>
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadSampleLaptopExcel}
                title="Download formatted Excel template"
                className="text-xs font-bold text-[#F26522] hover:underline flex items-center space-x-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel Template</span>
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={handleDownloadSampleLaptopCSV}
                title="Download CSV template"
                className="text-xs font-bold text-slate-500 hover:underline flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleUploadLaptops} className="space-y-3.5">
            <div className="border-2 border-dashed border-slate-200 hover:border-orange-400 rounded-xl p-6 text-center transition cursor-pointer bg-slate-50">
              <input
                type="file"
                accept=".csv"
                id="laptopFileInput"
                onChange={(e) => setLaptopFile(e.target.files[0])}
                className="hidden"
              />
              <label htmlFor="laptopFileInput" className="cursor-pointer block">
                <Upload className="w-7 h-7 text-[#F26522] mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-700">
                  {laptopFile ? laptopFile.name : 'Click or Drag CSV file here to upload'}
                </div>
                <div className="text-[10.5px] text-slate-400 mt-1">
                  Validates Asset Tag & Serial Number uniqueness in MySQL.
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={!laptopFile || uploadingLaptops}
              className="w-full py-2.5 bg-[#F26522] hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition"
            >
              {uploadingLaptops ? 'Processing & Validating...' : 'Start Laptop Import'}
            </button>
          </form>

          {/* Import Result Notification */}
          {laptopResult && (
            <div
              className={`p-3.5 rounded-xl text-xs space-y-1.5 border ${
                laptopResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="font-bold flex items-center space-x-1.5">
                {laptopResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{laptopResult.success ? 'Batch Import Successful!' : 'Import Failed'}</span>
              </div>
              {laptopResult.success ? (
                <div>
                  Successfully imported <strong>{laptopResult.importedCount}</strong> new laptops into MySQL.
                  {laptopResult.skippedCount > 0 && <span> ({laptopResult.skippedCount} skipped due to duplicates).</span>}
                </div>
              ) : (
                <div>{laptopResult.error}</div>
              )}
            </div>
          )}
        </div>

        {/* Bulk Student Import */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Bulk Student & Fee Import</span>
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadSampleStudentExcel}
                title="Download formatted Excel template"
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center space-x-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel Template</span>
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={handleDownloadSampleStudentCSV}
                title="Download CSV template"
                className="text-xs font-bold text-slate-500 hover:underline flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleUploadStudents} className="space-y-3.5">
            <div className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl p-6 text-center transition cursor-pointer bg-slate-50">
              <input
                type="file"
                accept=".csv"
                id="studentFileInput"
                onChange={(e) => setStudentFile(e.target.files[0])}
                className="hidden"
              />
              <label htmlFor="studentFileInput" className="cursor-pointer block">
                <Upload className="w-7 h-7 text-emerald-600 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-700">
                  {studentFile ? studentFile.name : 'Click or Drag student CSV file here'}
                </div>
                <div className="text-[10.5px] text-slate-400 mt-1">
                  Automatically initializes student accounts and annual license fee records.
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={!studentFile || uploadingStudents}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              {uploadingStudents ? 'Processing Students...' : 'Start Student Import'}
            </button>
          </form>

          {/* Import Result Notification */}
          {studentResult && (
            <div
              className={`p-3.5 rounded-xl text-xs space-y-1.5 border ${
                studentResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="font-bold flex items-center space-x-1.5">
                {studentResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{studentResult.success ? 'Student Import Successful!' : 'Import Failed'}</span>
              </div>
              {studentResult.success ? (
                <div>
                  Successfully registered <strong>{studentResult.importedCount}</strong> students and generated fee records.
                </div>
              ) : (
                <div>{studentResult.error}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
